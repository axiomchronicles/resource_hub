"""Email verification handler — typed, safe, resilient.

Responsibilities:
- Verify OTP for a given user/email
- Resend OTP with per-session and per-user rate limiting
- Robust attempt counting & lockout
- Clear, consistent state transitions in `otp` & `status`
- Thorough error handling

Assumptions:
- Users are stored in `connection.shallowuserregistration`
- `otp` subdoc on user matches structure created in RegisterAuthHub
- Template path: "email_templates/email_verification.html"

Dependencies:
- aquilify Request & responses
- exception.BaseApiException(message: str, status_code: int)
- utils.mailer.send_email(subject, message, recipient, context, template)
- axiomelectrus FieldOp for $datetime
"""
from __future__ import annotations

import ast
import asyncio
import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from aquilify.wrappers import Request
from aquilify.core.backend.sessions.localsessions import SessionManager
from aquilify import responses

from axiomelectrus.partials.insert import FieldOp

from ... import exception, connection
from ..utils import mailer

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# ---------------------------
# Config
# ---------------------------
@dataclass(frozen=True)
class Config:
    OTP_EXPIRES_MINUTES: int = 10
    OTP_VERIFY_MAX_ATTEMPTS: int = 5          # per-user verify attempts before lockout
    OTP_RESEND_MAX_PER_SESSION: int = 5       # per-session resend limit
    OTP_RESEND_COOLDOWN_SECONDS: int = 30     # min gap between resends for a single user
    MAIL_RETRY_ATTEMPTS: int = 3
    MAIL_RETRY_DELAY_SECONDS: float = 0.5

cfg = Config()


# ---------------------------
# Helpers
# ---------------------------

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _parse_iso(ts: str | None) -> Optional[datetime]:
    if not ts:
        return None
    try:
        # datetime.fromisoformat handles offsets
        dt = datetime.fromisoformat(ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _constant_time_eq(a: str, b: str) -> bool:
    try:
        return secrets.compare_digest(a, b)
    except Exception:
        return False


def _generate_otp() -> str:
    # 6-digit numeric, cryptographically strong
    return f"{secrets.randbelow(900000) + 100000:06d}"


async def _send_email_with_retries(subject: str, message: str, recipient: str, context: Dict[str, Any], attempts: int = cfg.MAIL_RETRY_ATTEMPTS) -> bool:
    last_exc: Optional[Exception] = None
    for attempt in range(1, attempts + 1):
        try:
            result = await asyncio.to_thread(
                mailer.send_email,
                subject,
                message,
                recipient,
                context,
                "email_templates/email_verification.html",
            )
            if result:
                return True
            last_exc = Exception("mailer.send_email returned falsy")
        except Exception as exc:
            last_exc = exc
            logger.warning("Mailer attempt %d failed: %s", attempt, exc)
            await asyncio.sleep(cfg.MAIL_RETRY_DELAY_SECONDS * attempt)
    logger.exception("All mail attempts failed: %s", last_exc)
    return False


# ---------------------------
# Main handler
# ---------------------------
class EmailVerification:
    def __init__(self) -> None:
        self.cfg = cfg
        self.session = SessionManager()
        self.logger = logger

    # ---------- Verify OTP ----------
    async def verify(self, request: Request) -> responses.JsonResponse:
        try:
            data = await request.json()
        except Exception:
            data = {}
        email: Optional[str] = (data.get("email") if isinstance(data, dict) else None) or request.session.get("user_registration_data", {}).get("email")
        code: Optional[str] = (data.get("otp") if isinstance(data, dict) else None)

        if not email:
            return responses.JsonResponse(content={"error": "Email is required."}, status=400)
        if not code or len(code) != 6:
            return responses.JsonResponse(content={"error": "Invalid OTP code."}, status=400)

        # Load the user by email
        try:
            user = await connection.shallowuserregistration.find().where(email = email).execute()
        except Exception as exc:
            self.logger.exception("DB error while fetching user for verify: %s", exc)
            return responses.JsonResponse(content={"error": "Server error."}, status=500)

        if not user.acknowledged:
            return responses.JsonResponse(content={"error": "User not found."}, status=404)
        
        user = user.raw_result[0] if isinstance(user.raw_result, list) else user.raw_result

        otp: Dict[str, Any] = (user.get("otp") or {})
        status_doc: Dict[str, Any] = (user.get("status") or {})

        # Already verified?
        if status_doc.get("isEmailVerified") is True or otp.get("isVerified") is True or otp.get("isUsed") is True:
            return responses.JsonResponse(content={"message": "Email already verified."}, status=200)

        # Attempt / lockout checks
        attempts = int(otp.get("count") or 0)
        max_attempts = int(otp.get("maxCount") or self.cfg.OTP_VERIFY_MAX_ATTEMPTS)
        if attempts >= max_attempts:
            return responses.JsonResponse(content={"error": "Maximum verification attempts exceeded. Please request a new OTP."}, status=429)

        # Expiry check
        expires_at = _parse_iso(otp.get("expiresAt"))
        if not expires_at or _now_utc() > expires_at:
            # mark expired
            try:
                await connection.shallowuserregistration.update(
                    {"email": email},
                    {"$set": {"otp.isExpired": True, "timestamps.updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")}},
                )
            except Exception:
                self.logger.exception("Failed to mark OTP expired for %s", email)
            return responses.JsonResponse(content={"error": "OTP has expired. Please request a new OTP."}, status=410)

        # Compare
        stored_code = str(otp.get("code") or "")
        if not _constant_time_eq(stored_code, code):
            # increment attempts
            try:
                await connection.shallowuserregistration.update(
                    {"email": email},
                    {"$inc": {"otp.count": 1}, "$set": {"timestamps.updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")}},
                )
            except Exception:
                self.logger.exception("Failed to increment OTP attempts for %s", email)
            return responses.JsonResponse(content={"error": "Incorrect OTP."}, status=400)

        # Success — mark verified & consume OTP
        try:
            update = {
                "$set": {
                    "otp.isVerified": True,
                    "otp.isUsed": True,
                    "otp.isExpired": False,
                    "status.isEmailVerified": True,
                    "timestamps.updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                },
                "$unset": {"otp.code": "", "otp.expiresAt": ""},  # no longer needed
            }
            result = await connection.shallowuserregistration.update({"email": email}, update)
            if not getattr(result, "acknowledged", True):
                return responses.JsonResponse(content={"error": "Failed to mark email verified."}, status=500)
        except Exception as exc:
            self.logger.exception("DB error while marking verified: %s", exc)
            return responses.JsonResponse(content={"error": "Server error while updating verification state."}, status=500)

        # Update session best-effort
        try:
            sess = request.session.get("user_registration_data") or {}
            sess["otp"] = {"isVerified": True, "isUsed": True, "isExpired": False}
            sess.setdefault("updatedAt", _to_iso(_now_utc()))
            request.session["user_registration_data"] = sess
        except Exception:
            self.logger.exception("Failed to update session after verify for %s", email)

        return responses.JsonResponse(content={"message": "Email verified successfully."}, status=200)

    # ---------- Resend OTP ----------
    async def resend(self, request: Request) -> responses.JsonResponse:
        try:
            data = await request.json()
        except Exception:
            data = {}
        email: Optional[str] = (data.get("email") if isinstance(data, dict) else None) or request.session.get("user_registration_data", {}).get("email")

        if not email:
            return responses.JsonResponse(content={"error": "Email is required."}, status=400)

        # Per-session rate limit
        session_key = "otp_resend_count"
        last_sent_key = "otp_last_sent_at"
        resend_count = int(request.session.get(session_key) or 0)
        if resend_count >= self.cfg.OTP_RESEND_MAX_PER_SESSION:
            return responses.JsonResponse(content={"error": "OTP resend limit reached for this session."}, status=429)

        last_sent_iso = request.session.get(last_sent_key)
        if last_sent_iso:
            last_sent = _parse_iso(last_sent_iso)
            if last_sent and (_now_utc() - last_sent).total_seconds() < self.cfg.OTP_RESEND_COOLDOWN_SECONDS:
                return responses.JsonResponse(content={"error": "Please wait before requesting another OTP."}, status=429)

        # Load user
        try:
            user = await connection.shallowuserregistration.find().where(email = email).execute()
        except Exception as exc:
            self.logger.exception("DB error while fetching user for resend: %s", exc)
            return responses.JsonResponse(content={"error": "Server error."}, status=500)

        if not user.acknowledged:
            return responses.JsonResponse(content={"error": "User not found."}, status=404)
        
        user = user.raw_result[0] if isinstance(user.raw_result, list) else user.raw_result

        status_doc: Dict[str, Any] = (user.get("status") or {})
        if status_doc.get("isEmailVerified") is True:
            return responses.JsonResponse(content={"message": "Email already verified."}, status=200)

        # Generate new OTP & expiry, reset attempt counter/state
        new_code = _generate_otp()
        new_expiry = _to_iso(_now_utc() + timedelta(minutes=self.cfg.OTP_EXPIRES_MINUTES))

        update = {
            "$set": {
                "otp.code": new_code,
                "otp.expiresAt": new_expiry,
                "otp.isVerified": False,
                "otp.isUsed": False,
                "otp.isExpired": False,
                "timestamps.updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            },
            "$setOnInsert": {},
            "$unset": {},
            "$rename": {},
        }
        # Reset attempts when resending
        update["$set"]["otp.count"] = 0
        update["$set"]["otp.maxCount"] = int((user.get("otp") or {}).get("maxCount") or self.cfg.OTP_VERIFY_MAX_ATTEMPTS)

        try:
            result = await connection.shallowuserregistration.update({"email": email}, update)
            if not getattr(result, "acknowledged", True):
                return responses.JsonResponse(content={"error": "Failed to issue new OTP."}, status=500)
        except Exception as exc:
            self.logger.exception("DB error while updating OTP for resend: %s", exc)
            return responses.JsonResponse(content={"error": "Server error while issuing OTP."}, status=500)

        # Email
        context = {
            "firstName": (user.get("name") or {}).get("firstName") or "",
            "lastName": (user.get("name") or {}).get("lastName") or "",
            "otpCode": new_code,
            "expiresAt": new_expiry,
        }

        ok = await _send_email_with_retries(
            subject="Email Verification for Resource Hub",
            message="Please verify your email address.",
            recipient=email,
            context=context,
        )
        if not ok:
            return responses.JsonResponse(content={"error": "Failed to send verification email."}, status=500)

        # Update session counters
        try:
            request.session[session_key] = resend_count + 1
            request.session[last_sent_key] = _to_iso(_now_utc())
            sess = request.session.get("user_registration_data") or {}
            sess["otp"] = {"code": "******", "expiresAt": new_expiry, "isVerified": False}
            request.session["user_registration_data"] = sess
        except Exception:
            self.logger.exception("Failed to update session after resend for %s", email)

        return responses.JsonResponse(content={"message": "A new OTP has been sent to your email."}, status=200)

    # ---------- Status (optional helper) ----------
    async def status(self, request: Request) -> responses.JsonResponse:
        """Return current email verification status for the session user or a provided email."""
        try:
            data = await request.json()
        except Exception:
            data = {}
        email: Optional[str] = (data.get("email") if isinstance(data, dict) else None) or request.session.get("user_registration_data", {}).get("email")
        if not email:
            return responses.JsonResponse(content={"error": "Email is required."}, status=400)
        try:
            user = await connection.shallowuserregistration.find().where(email = email).execute()
        except Exception as exc:
            self.logger.exception("DB error while fetching user for status: %s", exc)
            return responses.JsonResponse(content={"error": "Server error."}, status=500)
        if not user.acknowledged:
            return responses.JsonResponse(content={"error": "User not found."}, status=404)
        user = user.raw_result[0] if isinstance(user.raw_result, list) else user.raw_result
        otp = user.get("otp") or {}
        status_doc = user.get("status") or {}
        return responses.JsonResponse(
            content={
                "email": email,
                "isEmailVerified": bool(status_doc.get("isEmailVerified")),
                "otp": {
                    "isVerified": bool(otp.get("isVerified")),
                    "isExpired": bool(otp.get("isExpired")),
                    "isUsed": bool(otp.get("isUsed")),
                    "attempts": int(otp.get("count") or 0),
                    "maxAttempts": int(otp.get("maxCount") or cfg.OTP_VERIFY_MAX_ATTEMPTS),
                    "expiresAt": otp.get("expiresAt"),
                },
            }
        )


# module-level singleton for import
EmailVerificationView = EmailVerification()
