# users/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import make_password
from django.conf import settings
from .serializers import RegisterSerializer, OTPVerifySerializer
from .models import User, ProfilePic, OTP
from .utils import image_save, mailer
from django.core.cache import cache
from asgiref.sync import async_to_sync
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(getattr(settings, "MEDIA_ROOT", "media")) / "profile_pics"
OTP_TTL_MINUTES = getattr(settings, "OTP_EXPIRES_MINUTES", 10)
OTP_MAX_PER_USER_PER_HOUR = getattr(settings, "OTP_MAX_PER_USER_PER_HOUR", 5)
OTP_SESSION_LIMIT = getattr(settings, "OTP_MAX_PER_SESSION", 5)


def _user_otp_key(user_id: str) -> str:
    return f"otp_sent:{user_id}"


class RegisterAPIView(APIView):
    """
    Sync registration endpoint (safe with DRF). Blocking file/ORM operations run
    synchronously here. For production consider offloading heavy IO to Celery.
    """

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        # duplicate email check
        if User.objects.filter(email__iexact=data["email"]).exists():
            return Response({"error": "Email already registered"}, status=status.HTTP_400_BAD_REQUEST)

        # per-session rate limit (fallback)
        otp_count_session = request.session.get("otp_sent_count", 0)
        if otp_count_session >= OTP_SESSION_LIMIT:
            return Response({"error": "OTP send limit reached for this session"}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # create user (sync)
        hashed_pwd = make_password(data["password"])
        try:
            user = User.objects.create(
                email=data["email"],
                first_name=data.get("firstName", ""),
                last_name=data.get("lastName", ""),
                phone=data.get("phone", ""),
                university=data.get("university", ""),
                course=data.get("course", ""),
                year=data.get("year", None),
                dob=data.get("dob", None),
                consent=bool(data.get("consent", False)),
                password=hashed_pwd,
            )
        except Exception as exc:
            logger.exception("Failed to create user: %s", exc)
            return Response({"error": "Server error creating user"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        profile_meta = None

        # handle profile picture (sync file IO)
        uploaded = data.get("profilePic")
        if uploaded:
            try:
                profile_meta = image_save.save_uploaded_file(uploaded, UPLOAD_DIR)
                # persist ProfilePic model; build relative path for ImageField
                rel_path = Path(profile_meta["path"]).relative_to(getattr(settings, "MEDIA_ROOT", "media"))
                ProfilePic.objects.create(
                    user=user,
                    file=str(rel_path),
                    original_filename=profile_meta["original_filename"],
                    mime_type=profile_meta.get("content_type", ""),
                    size=profile_meta["size"],
                )
            except Exception as exc:
                logger.exception("Profile pic save failed, rolling back user: %s", exc)
                try:
                    user.delete()
                except Exception:
                    logger.exception("Failed to delete user after profile save failure")
                return Response({"error": "Failed to save profile picture"}, status=status.HTTP_400_BAD_REQUEST)

        # Rate-limit per-user via cache
        user_key = _user_otp_key(str(user.id))
        sent_count = cache.get(user_key, 0)
        if sent_count >= OTP_MAX_PER_USER_PER_HOUR:
            # Optionally clean up created user/profile here
            return Response({"error": "OTP send limit reached for this user. Try later."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # create OTP (sync)
        try:
            otp = OTP.create_for_user(user, OTP_TTL_MINUTES)
        except Exception as exc:
            logger.exception("Failed to create OTP: %s", exc)
            # cleanup
            if profile_meta:
                try:
                    Path(profile_meta["path"]).unlink(missing_ok=True)
                except Exception:
                    logger.exception("Failed to cleanup profile file after OTP failure")
            try:
                user.delete()
            except Exception:
                logger.exception("Failed to delete user after OTP failure")
            return Response({"error": "Server error creating OTP"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        cache.set(user_key, sent_count + 1, timeout=3600)

        # persist session info (sync)
        request.session["user_registration_data"] = {"user_id": str(user.id), "email": user.email}
        request.session["otp_sent_count"] = otp_count_session + 1
        try:
            request.session.save()
        except Exception:
            logger.exception("Failed to save session")

        # send verification email (async helper called synchronously via async_to_sync)
        template = "email_templates/email_verification.html"
        context = {
            "firstName": user.first_name,
            "lastName": user.last_name,
            "otpCode": otp.code,
            "expiresAt": otp.expires_at.isoformat(),
        }

        try:
            ok = mailer.send_email("Verify your email", [user.email], settings.DEFAULT_FROM_EMAIL, template_html_name = template, context = context)
        except Exception as exc:
            logger.exception("Mailer raised: %s", exc)
            ok = False

        if not ok:
            # rollback and cleanup
            try:
                if profile_meta:
                    Path(profile_meta["path"]).unlink(missing_ok=True)
                user.delete()
            except Exception:
                logger.exception("Failed to cleanup after mail failure")
            return Response({"error": "Failed to send verification email"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"message": "Registered, OTP sent"}, status=status.HTTP_201_CREATED)


class OTPVerifyAPIView(APIView):
    """
    Sync OTP verification endpoint.
    """

    def post(self, request, *args, **kwargs):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        try:
            user = User.objects.get(email__iexact=data["email"])
        except User.DoesNotExist:
            return Response({"error": "Invalid email/code"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Error fetching user: %s", exc)
            return Response({"error": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # find latest matching OTP
        otp = OTP.objects.filter(user=user, code=data["code"]).order_by("-created_at").first()
        if not otp:
            return Response({"error": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST)
        if otp.is_expired():
            return Response({"error": "OTP expired"}, status=status.HTTP_400_BAD_REQUEST)
        if otp.is_verified:
            return Response({"error": "OTP already used"}, status=status.HTTP_400_BAD_REQUEST)

        # mark verified and update user
        try:
            otp.mark_verified()
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])
        except Exception as exc:
            logger.exception("Failed to mark OTP/user verified: %s", exc)
            return Response({"error": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"message": "Email verified"}, status=status.HTTP_200_OK)

class ResendOTPAPIView(APIView):
    """
    Endpoint to resend an OTP for an existing (unverified) user.

    Request JSON:
        { "email": "user@example.com" }

    Responses:
        200 OK - { "message": "OTP resent" }
        400 Bad Request - missing email / already verified / invalid user
        429 Too Many Requests - rate/cooldown limits
        500 Server Error - mailer/database failure 
    """
    def post(self, request, *args, **kwargs):
        email = request.data.get("email") or request.query_params.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        # find user
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"error": "No user with that email"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Error fetching user for resend OTP: %s", exc)
            return Response({"error": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # don't resend if already verified
        if getattr(user, "is_email_verified", False):
            return Response({"error": "Email already verified"}, status=status.HTTP_400_BAD_REQUEST)

        # per-user hourly limit
        user_key = _user_otp_key(str(user.id))
        sent_count = cache.get(user_key, 0)
        if sent_count >= OTP_MAX_PER_USER_PER_HOUR:
            return Response({"error": "OTP send limit reached for this user. Try later."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # short cooldown to prevent rapid re-sends
        cooldown_seconds = getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60)
        cooldown_key = f"otp_cooldown:{user.id}"
        if cache.get(cooldown_key):
            return Response({"error": f"Please wait before requesting another OTP (cooldown {cooldown_seconds}s)."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # create otp
        try:
            otp = OTP.create_for_user(user, OTP_TTL_MINUTES)
        except Exception as exc:
            logger.exception("Failed to create OTP for resend: %s", exc)
            return Response({"error": "Server error creating OTP"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # increment counters & set cooldown (best-effort; we'll roll back if mail fails)
        cache.set(user_key, sent_count + 1, timeout=3600)
        cache.set(cooldown_key, True, timeout=cooldown_seconds)

        # send email
        template = "email_templates/email_verification.html"
        context = {
            "firstName": user.first_name,
            "lastName": user.last_name,
            "otpCode": otp.code,
            "expiresAt": otp.expires_at.isoformat(),
        }

        try:
            ok = mailer.send_email(
                "Verify your email",
                [user.email],
                settings.DEFAULT_FROM_EMAIL,
                template_html_name=template,
                context=context,
            )
        except Exception as exc:
            logger.exception("Mailer raised during resend OTP: %s", exc)
            ok = False

        if not ok:
            # rollback: delete created OTP and decrement cache count, clear cooldown
            try:
                otp.delete()
            except Exception:
                logger.exception("Failed to delete OTP after mail failure")
            try:
                # decrement sent counter safely
                new_count = max(0, (cache.get(user_key, 1) or 1) - 1)
                cache.set(user_key, new_count, timeout=3600)
            except Exception:
                logger.exception("Failed to decrement OTP counter after mail failure")
            try:
                cache.delete(cooldown_key)
            except Exception:
                logger.exception("Failed to clear cooldown after mail failure")

            return Response({"error": "Failed to send OTP email"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"message": "OTP resent"}, status=status.HTTP_200_OK)
