from __future__ import annotations

import logging
import inspect
import ast
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from aquilify.wrappers import Request
from aquilify import responses

from .models import EmailVerification as EmailVerificationModel

# imports used elsewhere in your project; adapt path if needed
from ... import exception, connection

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


async def _try_db_update(collection, filt: Dict[str, Any], update: Dict[str, Any]):
    """
    Try common update method names on the collection object and return result.
    Handles both synchronous and awaitable update methods.
    Raises AttributeError if no update method found or propagates underlying errors.
    """
    for name in ("updateOne", "update_one", "update"):
        fn = getattr(collection, name, None)
        if callable(fn):
            result = fn(filt, update)
            if inspect.isawaitable(result):
                result = await result
            logger.info(
                "DB update called: filter=%s update=%s result=%s",
                filt,
                update,
                getattr(result, "raw_result", result)
            )
            return result

    raise AttributeError("No supported update method found on collection object.")

class EmailVerification:
    """
    Handles the email verification process for users.
    """

    async def verify_email(self, request: Request):
        """
        Expected JSON payload:
        {
            "email": "user@example.com",
            "otp": "123456",
            "verificationId": "optional",
            "tempToken": "optional"
        }
        """
        try:
            formData = await request.json()
            modelData = EmailVerificationModel(formData)
        except Exception as e:
            logger.warning("Invalid verification payload: %s", e)
            return responses.JsonResponse(content={"error": "Invalid request payload"}, status=400)

        email = getattr(modelData, "email", None)
        otp = getattr(modelData, "otp", None)

        if not email or not otp:
            return responses.JsonResponse(content={"error": "Missing email or otp"}, status=400)

        # Helper: parse ISO expiry -> always return an aware UTC datetime or None
        def _parse_iso(s: Optional[str]) -> Optional[datetime]:
            if not s:
                return None
            try:
                # accept both with/without Z
                dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    # treat naive timestamps as UTC
                    return dt.replace(tzinfo=timezone.utc)
                # normalize to UTC
                return dt.astimezone(timezone.utc)
            except Exception:
                return None

        # 1) Fast path: check session-stored registration data
        session_data = request.session.get("user_registration_data")
        session_data = ast.literal_eval(session_data) if isinstance(session_data, str) else session_data
        if session_data and session_data.get("email") == email:
            otp_obj = session_data.get("otp") or {}
            session_code = otp_obj.get("code")
            session_expires = _parse_iso(otp_obj.get("expiresAt"))
            max_count = int(otp_obj.get("maxCount", 5) or 5)
            attempt_count = int(otp_obj.get("count", 0) or 0)

            if otp_obj.get("isVerified"):
                return responses.JsonResponse(content={"message": "Email already verified."}, status=200)

            # expiry check (use aware UTC now)
            now_utc = datetime.now(timezone.utc)
            if session_expires and now_utc > session_expires:
                return responses.JsonResponse(content={"error": "OTP expired. Request a new one."}, status=400)

            # check code
            if str(session_code) == str(otp):
                # mark verified in DB and session
                try:
                    # update DB by email or userId if available
                    user_filter = {"email": email}
                    if session_data.get("userId"):
                        user_filter = {"userId": session_data["userId"]}

                    update_doc = {
                        "$set": {
                            "otp.isVerified": True,
                            "otp.isUsed": True,
                            # store DB-facing timestamps as formatted strings
                            "otp.usedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                            "status.isEmailVerified": True,
                            "timestamps.updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                        }
                    }
                    update_res = await _try_db_update(connection.shallowuserregistration, user_filter, update_doc)
                    logger.info("Fast-path DB update result for %s: %s", email, getattr(update_res, "raw_result", update_res))
                except Exception:
                    logger.exception("Failed to update user record to verified for %s", email)
                    # don't fail the verification entirely for DB update failure; still mark session verified

                # update session (keep ISO format for session storage)
                session_data["otp"]["isVerified"] = True
                session_data["otp"]["isUsed"] = True
                session_data["otp"]["usedAt"] = datetime.now(timezone.utc).isoformat()
                request.session["user_registration_data"] = session_data

                return responses.JsonResponse(content={"message": "Email verification successful"}, status=200)
            else:
                # increment attempt count and maybe expire
                attempt_count += 1
                session_data["otp"]["count"] = attempt_count
                if attempt_count >= max_count:
                    session_data["otp"]["isExpired"] = True
                request.session["user_registration_data"] = session_data
                return responses.JsonResponse(content={"error": "Invalid OTP"}, status=401)

        # 2) Fallback: lookup user in DB by email (and optional verificationId/tempToken if used)
        try:
            # find user by email
            user_lookup = await connection.shallowuserregistration.find().where(email=email).execute()
        except Exception:
            logger.exception("DB lookup failed while verifying email for %s", email)
            return responses.JsonResponse(content={"error": "Server error"}, status=500)

        if not user_lookup:
            return responses.JsonResponse(content={"error": "User not found"}, status=404)

        # `user_lookup` might be a wrapper; try pulling actual doc
        user = user_lookup if isinstance(user_lookup, dict) else getattr(user_lookup, "doc", None) or user_lookup

        # attempt to find OTP object inside user document
        otp_obj = user.get("otp") if isinstance(user, dict) else None
        if not otp_obj:
            return responses.JsonResponse(content={"error": "No OTP found for this user"}, status=400)

        # already verified?
        if otp_obj.get("isVerified"):
            return responses.JsonResponse(content={"message": "Email already verified."}, status=200)

        code = str(otp_obj.get("code", ""))
        expires_at = _parse_iso(otp_obj.get("expiresAt"))
        count = int(otp_obj.get("count", 0) or 0)
        max_count = int(otp_obj.get("maxCount", 5) or 5)

        # check expiry
        now_utc = datetime.now(timezone.utc)
        if expires_at and now_utc > expires_at:
            # mark expired in DB
            try:
                await _try_db_update(
                    connection.shallowuserregistration,
                    {"email": email},
                    {"$set": {"otp.isExpired": True, "timestamps.updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")}},
                )
            except Exception:
                logger.exception("Failed to mark OTP expired for %s", email)
            return responses.JsonResponse(content={"error": "OTP expired. Request a new one."}, status=400)

        # verify code
        if str(otp) != code:
            # increment count and possibly expire
            new_count = count + 1
            ops = {"$set": {"otp.count": new_count, "timestamps.updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")}}
            if new_count >= max_count:
                ops["$set"]["otp.isExpired"] = True
            try:
                await _try_db_update(connection.shallowuserregistration, {"email": email}, ops)
            except Exception:
                logger.exception("Failed to increment OTP count for %s", email)
            return responses.JsonResponse(content={"error": "Invalid OTP"}, status=401)

        # success: mark verified
        try:
            update_doc = {
                "$set": {
                    "otp.isVerified": True,
                    "otp.isUsed": True,
                    "otp.usedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                    "status.isEmailVerified": True,
                    "timestamps.updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                }
            }
            update_res = await _try_db_update(connection.shallowuserregistration, {"email": email}, update_doc)
            logger.info("Fallback DB update result for %s: %s", email, getattr(update_res, "raw_result", update_res))
        except Exception:
            logger.exception("Failed to update user record as verified for %s", email)
            return responses.JsonResponse(content={"error": "Server error while verifying"}, status=500)

        # Optionally, refresh session if present
        if request.session.get("user_registration_data") and request.session["user_registration_data"].get("email") == email:
            sd = request.session["user_registration_data"]
            sd["otp"]["isVerified"] = True
            sd["otp"]["isUsed"] = True
            sd["otp"]["usedAt"] = datetime.now(timezone.utc).isoformat()
            request.session["user_registration_data"] = sd
 
        return responses.JsonResponse(content={"message": "Email verification successful"}, status=200)


EmailVerificationView = EmailVerification()
