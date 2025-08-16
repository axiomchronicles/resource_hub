"""Register handler — enhanced, typed, safe, and production-ready.

Features:
- async streamed upload saving with atomic rename
- optional image resizing & content sniffing
- OTP generation + simple per-session rate-limiting
- mailer retry (non-blocking)
- thorough error handling & cleanup
"""

from __future__ import annotations

import os
import re
import uuid
import secrets
import logging
import asyncio
from dataclasses import dataclass
from typing import Any, Dict, Optional, Set
from pathlib import Path
from datetime import datetime, timedelta

import aiofiles

# optional libs (used if available)
try:
    from PIL import Image
except Exception:
    Image = None

try:
    import magic as magiclib  # python-magic
except Exception:
    magiclib = None

try:
    import numpy as np
except Exception:
    np = None

from aquilify.wrappers import Request
from aquilify.core.backend.sessions.localsessions import SessionManager
from aquilify.security import crypter
from aquilify.datastructure.core import UploadFile
from axiomelectrus.partials.insert import FieldOp
from aquilify import responses

from .models import UserRegistrationModel
from .. import exception, connection
from .utils import mailer, mask

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# ---------------------------
# Configuration dataclass
# ---------------------------
@dataclass(frozen=True)
class Config:
    UPLOAD_DIR: Path = Path(os.getenv("MEDIA_ROOT", "uploads/profile"))
    MAX_SIZE: int = int(os.getenv("MAX_PROFILE_PIC_SIZE", 10 * 1024 * 1024))  # 10MB
    ALLOWED_EXTENSIONS: Set[str] = frozenset({"jpg", "jpeg", "png", "gif", "webp"})
    ALLOWED_MIMES_PREFIX: str = "image/"
    IMAGE_MAX_DIM: int = int(os.getenv("IMAGE_MAX_DIM", 1024))  # max width/height in px
    OTP_EXPIRES_MINUTES: int = 10
    OTP_MAX_PER_SESSION: int = 5
    MAIL_RETRY_ATTEMPTS: int = 3
    MAIL_RETRY_DELAY_SECONDS: float = 0.5
    CHUNK_SIZE: int = 64 * 1024  # 64KB


cfg = Config()
cfg.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------
# Utility helpers
# ---------------------------
def _sanitize_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return ext if ext else ""


def _is_valid_extension(ext: str, allowed: Set[str]) -> bool:
    return bool(ext) and ext.lstrip(".") in allowed


def _safe_original_name(filename: str) -> str:
    # keep letters, digits, dots, hyphens and underscores; replace others with underscore
    return re.sub(r"[^\w\.\-\s]", "_", filename).strip().replace(" ", "_")


def _generate_uuid_filename(ext: str) -> str:
    if not ext:
        ext = ".jpg"
    return f"{uuid.uuid4()}{ext}"


def _generate_otp() -> str:
    # Prefer numpy if available, else secrets
    if np is not None:
        try:
            val = int(np.random.randint(100000, 1000000))
            return f"{val:06d}"
        except Exception: 
            pass
    return f"{secrets.randbelow(900000) + 100000:06d}"


async def _send_email_with_retries(subject: str, message: str, recipient: str, context: Dict[str, Any], attempts: int = cfg.MAIL_RETRY_ATTEMPTS) -> bool:
    # mailer.send_email might be blocking; run in thread and retry
    last_exc: Optional[Exception] = None
    for attempt in range(1, attempts + 1):
        try:
            # run blocking mailer in a thread so we don't block event loop
            result = await asyncio.to_thread(mailer.send_email, subject, message, recipient, context, "email_templates/email_verification.html")
            if result:
                return True
            last_exc = Exception("mailer.send_email returned falsy")
        except Exception as exc:
            last_exc = exc
            logger.warning("Mailer attempt %d failed: %s", attempt, exc)
            await asyncio.sleep(cfg.MAIL_RETRY_DELAY_SECONDS * attempt)
    logger.exception("All mail attempts failed: %s", last_exc)
    return False


async def _maybe_normalize_image(temp_path: Path, max_dim: int) -> None:
    """Resize/normalize image if Pillow available. Overwrites file in-place."""
    if Image is None:
        return
    try:
        with Image.open(temp_path) as im:
            # convert to RGB for consistent formats (PNG/GIF/webp handled gracefully)
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            w, h = im.size
            if max(w, h) > max_dim:
                # preserve aspect ratio
                scale = max_dim / max(w, h)
                new_size = (int(w * scale), int(h * scale))
                im = im.resize(new_size, Image.LANCZOS)
            # overwrite (choose PNG for transparency or JPEG otherwise)
            # preserve original format if safe
            format = im.format if im.format else "JPEG"
            # Save with reasonable quality
            im.save(temp_path, format=format, quality=85, optimize=True)
    except Exception:
        logger.exception("Image normalization failed for %s", temp_path)
        # don't fail upload for normalization issues


async def _detect_mime_from_file(path: Path) -> Optional[str]:
    if magiclib is None:
        return None
    try:
        m = magiclib.Magic(mime=True)
        return m.from_file(str(path))
    except Exception:
        logger.exception("python-magic detection failed")
        return None


# ---------------------------
# Main Register class
# ---------------------------
class RegisterAuthHub:
    def __init__(self) -> None:
        self.session = SessionManager()
        self.cfg = cfg
        self.logger = logger

    async def _stream_save(self, upload: UploadFile) -> Dict[str, Any]:
        """Stream upload to disk atomically, optionally normalize image, and return metadata."""
        original = upload.filename or ""
        if not original:
            raise exception.BaseApiException(message="Uploaded file must have a filename.", status_code=400)
        safe_original = _safe_original_name(original)
        ext = _sanitize_extension(original) or ".jpg"

        if not _is_valid_extension(ext, self.cfg.ALLOWED_EXTENSIONS):
            raise exception.BaseApiException(
                message=f"Invalid profile picture format. Allowed: {', '.join(sorted(self.cfg.ALLOWED_EXTENSIONS))}.",
                status_code=400,
            )

        target_name = _generate_uuid_filename(ext)
        temp_path = self.cfg.UPLOAD_DIR / (target_name + ".tmp")
        final_path = self.cfg.UPLOAD_DIR / target_name

        bytes_written = 0
        try:
            # write stream to temporary file with aiofiles
            async with aiofiles.open(temp_path, "wb") as f:
                while True:
                    chunk = await upload.read(self.cfg.CHUNK_SIZE)
                    if not chunk:
                        break
                    await f.write(chunk)
                    bytes_written += len(chunk)
                    if bytes_written > self.cfg.MAX_SIZE:
                        # remove partial and raise
                        try:
                            await f.close()
                        except Exception:
                            pass
                        temp_path.unlink(missing_ok=True)
                        raise exception.BaseApiException(
                            message=f"Profile picture exceeds allowed size of {self.cfg.MAX_SIZE} bytes.",
                            status_code=400,
                        )

            # optionally detect mime (if python-magic installed) and validate
            mime = await _detect_mime_from_file(temp_path)
            if mime and not mime.startswith(self.cfg.ALLOWED_MIMES_PREFIX):
                temp_path.unlink(missing_ok=True)
                raise exception.BaseApiException(message="Uploaded file is not a valid image.", status_code=400)

            # optional image normalization (resize/compress)
            await _maybe_normalize_image(temp_path, self.cfg.IMAGE_MAX_DIM)

            # final size after normalization
            final_size = temp_path.stat().st_size

            # atomic replace
            os.replace(str(temp_path), str(final_path))

            # ensure upload object closed
            try:
                await upload.close()
            except Exception:
                pass

            return {
                "filename": target_name,
                "original_filename": safe_original,
                "content_type": upload.content_type or (mime or ""),
                "size": final_size,
                "path": str(final_path),
            }

        except exception.BaseApiException:
            raise
        except Exception as exc:
            # attempt cleanup
            try:
                temp_path.unlink(missing_ok=True)
            except Exception:
                pass
            try:
                final_path.unlink(missing_ok=True)
            except Exception:
                pass
            self.logger.exception("Failed to save upload: %s", exc)
            raise exception.BaseApiException(message="Failed to save uploaded file.", status_code=500)

    async def registerhub(self, request: Request) -> responses.JsonResponse:
        try:
            # Accept multipart/form-data (text + optional file)
            form = await request.form()
            modelData = UserRegistrationModel(form)

            # basic validation: passwords
            if getattr(modelData, "password", None) is None:
                raise exception.BaseApiException(message="Password is required.", status_code=400)

            if getattr(modelData, "password", None) != getattr(modelData, "confirmPassword", None):
                raise exception.BaseApiException(message="Passwords do not match.", status_code=400)

            # parse/validate year and consent
            try:
                year_val: Optional[int] = int(modelData.year) if modelData.year is not None else None
            except Exception:
                raise exception.BaseApiException(message="Invalid year provided.", status_code=400)

            consent_val: bool = bool(modelData.consent)

            # Check existing user - keep original semantics (adjust depending on connection API)
            existing_user = await connection.shallowuserregistration.find().where(
                studentId=modelData.studentId, email=modelData.email, phone=modelData.phone
            ).execute()
            if getattr(existing_user, "acknowledged", False):
                raise exception.BaseApiException(message="User already exists.", status_code=400)

            # Hash password (store only hashed)
            hashed_password = crypter.hashpw(modelData.password, method="scrypt", salt_length=16)

            # handle optional profile picture
            saved_profile: Optional[Dict[str, Any]] = None
            if isinstance(modelData.profilePic, UploadFile):
                upload_file: UploadFile = modelData.profilePic

                # quick mime check (content_type may be None)
                content_type = (upload_file.content_type or "")  # e.g., "image/png"
                if content_type and not content_type.startswith(self.cfg.ALLOWED_MIMES_PREFIX):
                    raise exception.BaseApiException(message="Profile picture must be an image.", status_code=400)

                # stream-save (validates ext, size, optional mime, normalization)
                saved_profile = await self._stream_save(upload_file)

            # prepare OTP and rate-limit per session
            otp_code = _generate_otp()
            otp_expires = (datetime.utcnow() + timedelta(minutes=self.cfg.OTP_EXPIRES_MINUTES)).isoformat()

            # simple per-session OTP rate-limiting
            otp_count = request.session["otp_sent_count"] or 0
            if otp_count >= self.cfg.OTP_MAX_PER_SESSION:
                raise exception.BaseApiException(message="OTP send limit reached for this session.", status_code=429)
            await self.session.set("otp_sent_count", otp_count + 1)

            # compose DB document (do not persist confirmPassword)
            user_id = str(uuid.uuid4())
            user_doc = {
                "collectionId": FieldOp.AUTO_INC.value,
                "userId": user_id,
                "name": {"firstName": modelData.firstName, "lastName": modelData.lastName},
                "studentId": modelData.studentId,
                "email": modelData.email,
                "dob": modelData.dob,
                "password": hashed_password,
                "university": modelData.university,
                "course": modelData.course,
                "year": year_val,
                "phone": modelData.phone,
                "consent": consent_val,
                "profile": saved_profile,
                "otp": {
                    "code": otp_code,
                    "expiresAt": otp_expires,
                    "isVerified": False,
                    "isUsed": False,
                    "isExpired": False,
                    "isResendAllowed": True,
                    "count": 0,
                    "maxCount": 5,
                },
                "timestamps": {
                    "createdAt": "$datetime",
                    "updatedAt": "$datetime",
                    "deletedAt": None,
                    "lastLogin": None,
                },
                "status": {
                    "isEmailVerified": False,
                    "isPhoneVerified": False,
                    "isProfileComplete": False,
                    "isActive": True,
                    "isTermsAccepted": consent_val,
                },
            }

            # Attempt DB insert and ensure cleanup on failure
            try:
                result = await connection.shallowuserregistration.insertOne(user_doc)
                if not getattr(result, "acknowledged", False):
                    # cleanup file if any
                    if saved_profile:
                        try:
                            Path(saved_profile["path"]).unlink(missing_ok=True)
                        except Exception:
                            logger.exception("Failed to cleanup profile image after DB insert failed")
                    raise exception.BaseApiException(message="Failed to register user.", status_code=500)

                # create logs / metadata (best-effort; ignore failures but log)
                try:
                    log_data = {
                        "collectionId": result.inserted_id,
                        "userId": user_id,
                        "action": "register",
                        "details": {"studentId": modelData.studentId, "email": modelData.email},
                        "timestamps": {"createdAt": FieldOp.DATETIME.value, "updatedAt": FieldOp.DATETIME.value},
                    }
                    await connection.usercollectionlogs.insertOne(log_data)

                    metadata = {
                        "collectionId": result.inserted_id,
                        "userId": user_id,
                        "metadata": {
                            "profile": saved_profile,
                            "university": modelData.university,
                            "course": modelData.course,
                            "year": year_val,
                            "createdAt": datetime.utcnow().isoformat(),
                            "updatedAt": datetime.utcnow().isoformat(),
                        },
                    }
                    await connection.usercollectionmetadata.insertOne(metadata)

                    user_collection_data = {
                        "collectionId": result.inserted_id,
                        "userId": user_id,
                        "name": {"firstName": modelData.firstName, "lastName": modelData.lastName},
                        "studentId": modelData.studentId,
                        "email": modelData.email,
                        "phone": modelData.phone,
                        "profile": saved_profile,
                        "createdAt": datetime.utcnow().isoformat(),
                        "updatedAt": datetime.utcnow().isoformat(),
                    }
                    await connection.usercollection.insertOne(user_collection_data)
                except Exception:
                    logger.exception("Non-fatal: failed to write user metadata/logs")

            except exception.BaseApiException:
                raise
            except Exception as db_exc:
                # cleanup file if DB entirely failed
                if saved_profile:
                    try:
                        Path(saved_profile["path"]).unlink(missing_ok=True)
                    except Exception:
                        logger.exception("Failed to cleanup after DB error")
                logger.exception("DB insert failed: %s", db_exc)
                raise exception.BaseApiException(message="Server error while registering user.", status_code=500)

            # session persistence
            session_data = {
                "userId": user_id,
                "email": user_doc["email"],
                "otp": user_doc["otp"],
                "profilePic": saved_profile,
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
            }
            request.session["user_registration_data"] = session_data
            # Send verification email with retries (non-blocking)
            context = {
                "firstName": modelData.firstName,
                "lastName": modelData.lastName,  
                "otpCode": user_doc["otp"]["code"],
                "expiresAt": user_doc["otp"]["expiresAt"],
            }

            ok = await _send_email_with_retries( 
                subject="Email Verification for Resource Hub",
                message="Please verify your email address.",
                recipient=modelData.email,
                context=context,
            )

            if not ok:
                # optionally rollback registration or just warn — here we treat it as error 
                logger.warning("Email sending failed for %s (user %s)", modelData.email, user_id)
                raise exception.BaseApiException(message="Failed to send verification email.", status_code=500)

            return responses.JsonResponse(content={"message": "User registration successful"})

        except exception.BaseApiException as e:
            return responses.JsonResponse(content={"error": e.message}, status=e.status_code)

        except Exception as e:
            logger.exception("Unexpected error in registerhub: %s", e)
            return responses.JsonResponse(content={"error": "An unexpected error occurred: " + str(e)}, status=500)


# module-level singleton for import
RegisterAuthHubView = RegisterAuthHub()
