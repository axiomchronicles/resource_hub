# users/views_auth.py
from __future__ import annotations
from typing import Optional, Tuple

import logging
from datetime import datetime, timedelta, timezone as dt_timezone

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.hashers import check_password
from django.core.cache import cache
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication

import json
# Try to import DRF token support (optional)
try:
    from rest_framework.authtoken.models import Token
    from rest_framework.authentication import TokenAuthentication
    HAS_DRF_TOKEN = True
except Exception:
    Token = None
    TokenAuthentication = None
    HAS_DRF_TOKEN = False

from .serializers import LoginSerializer, SafeUserSerializer
from .models import User as UserModel  # adjust if needed

logger = logging.getLogger(__name__)

# Configurable throttle defaults
LOGIN_THROTTLE_MAX_ATTEMPTS = getattr(settings, "AUTH_LOGIN_MAX_ATTEMPTS", 5)
LOGIN_THROTTLE_BLOCK_SECONDS = getattr(settings, "AUTH_LOGIN_BLOCK_SECONDS", 300)  # 5 minutes
LOGIN_THROTTLE_CACHE_PREFIX = getattr(settings, "AUTH_LOGIN_CACHE_PREFIX", "auth:login_attempts:")

# Token-related settings (defaults)
AUTH_USE_TOKEN = getattr(settings, "AUTH_USE_TOKEN", True)
AUTH_TOKEN_ONLY = getattr(settings, "AUTH_TOKEN_ONLY", True)
AUTH_TOKEN_EXPIRATION_SECONDS = getattr(settings, "AUTH_TOKEN_EXPIRATION_SECONDS", 86400)  # 1 day
AUTH_TOKEN_SINGLE_USE = getattr(settings, "AUTH_TOKEN_SINGLE_USE", True)


def _get_client_ip(request) -> str:
    """Return client's IP from request (trusting X-Forwarded-For if present)."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _throttle_key(email: Optional[str], ip: str) -> str:
    email_part = (email or "").lower()
    return f"{LOGIN_THROTTLE_CACHE_PREFIX}{email_part}:{ip}"


def _get_attempts(key: str) -> int:
    try:
        return int(cache.get(key) or 0)
    except Exception:
        logger.exception("Cache read failed for throttle key %s", key)
        return 0


def _increment_attempts(key: str) -> int:
    """
    Increment attempts atomically where possible.
    Keeps the TTL set to LOGIN_THROTTLE_BLOCK_SECONDS on first set.
    """
    try:
        current = cache.get(key)
        if current is None:
            cache.set(key, 1, timeout=LOGIN_THROTTLE_BLOCK_SECONDS)
            return 1
        try:
            return int(cache.incr(key))
        except Exception:
            new = int(current) + 1
            # When we manually set a new value, renew TTL to block window to apply consistent blocking.
            cache.set(key, new, timeout=LOGIN_THROTTLE_BLOCK_SECONDS)
            return new
    except Exception:
        logger.exception("Cache increment failed for key %s", key)
        return 0


def _reset_attempts(key: str) -> None:
    try:
        cache.delete(key)
    except Exception:
        logger.exception("Failed to reset login attempts for key %s", key)


def _verify_password(user, raw_password: str) -> bool:
    """
    Verify password for user. Prefer user's check_password method if available,
    else attempt to verify 'password_hash' field if present.
    """
    if not user:
        return False

    if hasattr(user, "check_password"):
        try:
            return user.check_password(raw_password)
        except Exception:
            logger.exception("check_password raised an exception for user %s", getattr(user, "email", "<unknown>"))
            return False

    if hasattr(user, "password_hash"):
        try:
            return check_password(raw_password, getattr(user, "password_hash"))
        except Exception:
            logger.exception("Failed to check password_hash for user %s", getattr(user, "email", "<unknown>"))
            return False

    return False


def _get_session_expiry_info(request) -> Tuple[Optional[int], Optional[str]]:
    """
    Return (seconds_until_expiry, iso_utc_expiry_string) for the current session.
    If session has no expiry, returns (None, None).
    """
    try:
        age = request.session.get_expiry_age()
        expiry_dt = timezone.now() + timedelta(seconds=age)
        expiry_iso = expiry_dt.astimezone(dt_timezone.utc).replace(tzinfo=dt_timezone.utc).isoformat().replace("+00:00", "Z")
        return age, expiry_iso
    except Exception:
        return None, None


def _is_django_admin(user) -> bool:
    """
    Heuristic: returns True if the user appears to be an admin account.
    """
    if not user:
        return False

    # standard Django admin flags
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True

    # some projects add custom flags like is_admin / is_site_admin
    if getattr(user, "is_admin", False) or getattr(user, "is_site_admin", False):
        return True

    # check group names that commonly indicate admin accounts
    try:
        groups_qs = getattr(user, "groups", None)
        if groups_qs is not None:
            group_names = [g.name.lower() for g in groups_qs.all()]
            for admin_name in ("admin", "admins", "django-admin", "site-admin", "staff"):
                if admin_name in group_names:
                    return True
    except Exception:
        logger.debug("Group membership check failed for user id=%s", getattr(user, "pk", None), exc_info=True)

    return False


class LoginAPIView(APIView):
    """
    POST /api/auth/login/
    Body: { "email": "...", "password": "...", "remember_me": <bool, optional> }
    Returns token when token auth is enabled.
    """
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""
        remember_me = bool(request.data.get("remember_me", False))

        client_ip = _get_client_ip(request)
        ua = request.META.get("HTTP_USER_AGENT", "")[:512]
        throttle_key = _throttle_key(email, client_ip)

        # throttle check
        attempts = _get_attempts(throttle_key)
        if attempts and attempts >= LOGIN_THROTTLE_MAX_ATTEMPTS:
            logger.warning("Login blocked due to too many attempts (ip=%s)", client_ip)
            return Response({"detail": "Too many failed attempts. Try again later."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Flush existing session up-front so existing admin session won't collide if token-only is False.
        try:
            if getattr(request, "user", None) and getattr(request.user, "is_authenticated", False):
                request.session.flush()
        except Exception:
            logger.debug("Failed to flush existing session (non-fatal)", exc_info=True)

        # Try standard authenticate first (works with username/email depending on backend)
        user = None
        try:
            user = authenticate(request, username=email, password=password)
            if user is None:
                user = authenticate(request, email=email, password=password)
        except Exception:
            logger.debug("authenticate() raised; will fallback to manual lookup", exc_info=True)
            user = None

        # Fallback: manual lookup + password verification
        backend_to_use = None
        if not user:
            try:
                user_obj = UserModel.objects.filter(email__iexact=email).first()
            except Exception:
                logger.exception("DB error fetching user for login")
                return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            if not user_obj or not _verify_password(user_obj, password):
                new_attempts = _increment_attempts(throttle_key)
                logger.info("Failed login attempt (ip=%s attempts=%s ua=%s)", client_ip, new_attempts, ua)
                return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

            user = user_obj
            try:
                backends = getattr(settings, "AUTHENTICATION_BACKENDS", [])
                if backends:
                    backend_to_use = backends[0]
            except Exception:
                backend_to_use = None

        # Deny admin accounts via API
        if _is_django_admin(user):
            return Response(
                {
                    "detail":
                        "Admin accounts are not permitted to access this API endpoint. "
                        "Please use the Django admin site for administrative tasks."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # active flag check
        if getattr(user, "is_active", True) is False:
            logger.info("Attempt to login to inactive account (ip=%s ua=%s)", client_ip, ua)
            return Response({"detail": "Account inactive."}, status=status.HTTP_403_FORBIDDEN)

        # on successful auth: reset throttling
        try:
            _reset_attempts(throttle_key)
        except Exception:
            logger.exception("Failed to reset throttle key %s", throttle_key)

        token_value = None
        token_expires_in = None
        token_expires_at = None

        # If token auth is enabled and available, create / return token
        if AUTH_USE_TOKEN and HAS_DRF_TOKEN:
            try:
                if AUTH_TOKEN_SINGLE_USE:
                    # Always delete old tokens
                    Token.objects.filter(user=user).delete()
                    token_obj = Token.objects.create(user=user)
                else:
                    token_obj, _ = Token.objects.get_or_create(user=user)

                token_value = token_obj.key

                if AUTH_TOKEN_EXPIRATION_SECONDS:
                    token_expires_in = int(AUTH_TOKEN_EXPIRATION_SECONDS)
                    token_expires_at_dt = token_obj.created + timedelta(seconds=AUTH_TOKEN_EXPIRATION_SECONDS)

                    # Ensure it's timezone-aware
                    if timezone.is_naive(token_expires_at_dt):
                        token_expires_at_dt = timezone.make_aware(token_expires_at_dt, timezone.get_current_timezone())

                    # ✅ use datetime.timezone.utc instead of timezone.utc
                    token_expires_at = token_expires_at_dt.astimezone(dt_timezone.utc).isoformat().replace("+00:00", "Z")

            except Exception:
                logger.exception("Failed to create token for user %s", getattr(user, "email", "<unknown>"))
                token_value = None

        # If we also want to create a session (AUTH_TOKEN_ONLY == False), create it safely
        if not AUTH_TOKEN_ONLY:
            try:
                with transaction.atomic():
                    if backend_to_use:
                        login(request, user, backend=backend_to_use)
                    else:
                        login(request, user)
                try:
                    request.session.cycle_key()
                except Exception:
                    logger.debug("session.cycle_key() failed (non-fatal)", exc_info=True)
                try:
                    request.session.save()
                except Exception:
                    logger.debug("session.save() failed (non-fatal)", exc_info=True)
            except Exception:
                logger.exception("Failed during session creation for user %s", getattr(user, "email", "<unknown>"))
                return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # per-session expiry (remember me)
            try:
                if remember_me:
                    rm_age = getattr(settings, "AUTH_REMEMBER_ME_SESSION_AGE", getattr(settings, "SESSION_COOKIE_AGE", None))
                    if rm_age:
                        request.session.set_expiry(int(rm_age))
                else:
                    request.session.set_expiry(0)
            except Exception:
                logger.exception("Failed to set per-session expiry for user %s", getattr(user, "email", "<unknown>"))

            # update last_login best-effort
            try:
                user.last_login = timezone.now()
                user.save(update_fields=["last_login"])
            except Exception:
                logger.debug("Failed to update last_login (non-fatal)", exc_info=True)

        # prepare response user data
        try:
            user_data = SafeUserSerializer(user, context={"request": request}).data
        except Exception:
            logger.exception("SafeUserSerializer failed", exc_info=True)
            user_data = {"id": str(user.pk), "email": getattr(user, "email", "")}

        resp = {"user": user_data}
        if token_value:
            resp["token"] = token_value
            if token_expires_in is not None:
                resp["token_expires_in"] = token_expires_in
            if token_expires_at is not None:
                resp["token_expires_at"] = token_expires_at

        # if session exists, include session expiry info & CSRF token
        if not AUTH_TOKEN_ONLY:
            session_seconds, session_expires_at = _get_session_expiry_info(request)
            csrf_token = None
            try:
                csrf_token = get_token(request)
            except Exception:
                logger.debug("Failed to get CSRF token (non-fatal)", exc_info=True)
            if session_seconds is not None:
                resp["session_expires_in"] = session_seconds
            if session_expires_at is not None:
                resp["session_expires_at"] = session_expires_at
            if csrf_token:
                resp["csrf_token"] = csrf_token

        logger.info("User logged in (ip=%s ua=%s) user_id=%s", client_ip, ua, getattr(user, "pk", None))
        return Response(resp, status=status.HTTP_200_OK)


def _get_session_expiry_info(request):
    """
    Return (seconds_remaining, expires_at_iso) or (None, None) if unavailable.
    Uses Django session helpers.
    """
    try:
        seconds = request.session.get_expiry_age()
        expires_at = request.session.get_expiry_date()
        if seconds is None or (isinstance(seconds, int) and seconds <= 0):
            return None, None
        expires_iso = expires_at.astimezone(timezone.utc).isoformat()
        return int(seconds), expires_iso
    except Exception:
        return None, None


class MeAPIView(APIView):
    """
    GET /api/auth/me/ - returns current user info.
    Supports token auth (if available) and session auth.
    """
    # include TokenAuthentication if available to allow token-based me lookups
    authentication_classes = ([TokenAuthentication] if HAS_DRF_TOKEN else [])

    def get(self, request, *args, **kwargs):
        try:
            logger.debug(
                "MeAPIView: user=%s, authenticated=%s, session_key=%s",
                getattr(request, "user", None),
                getattr(request.user, "is_authenticated", False),
                getattr(request.session, "session_key", None),
            )

            user = getattr(request, "user", None)
            if not user or not getattr(user, "is_authenticated", False):
                return Response(
                    {"detail": "Authentication credentials were not provided."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Deny admin accounts from using this API endpoint.
            if _is_django_admin(user):
                return Response(
                    {
                        "detail":
                            "Admin accounts are not permitted to access this API endpoint. "
                            "Please use the Django admin site for administrative tasks."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Account active check
            if hasattr(user, "is_active") and not user.is_active:
                return Response({"detail": "User account is disabled."}, status=status.HTTP_403_FORBIDDEN)

            # Session sanity check: ensure session user id resolves (if session used)
            try:
                if getattr(request, "session", None) and getattr(user, "pk", None) is None:
                    request.session.flush()
                    return Response({"detail": "Invalid session. Please log in again."}, status=status.HTTP_401_UNAUTHORIZED)
            except Exception:
                logger.exception("Error accessing user.pk during /auth/me check")
                if getattr(request, "session", None):
                    request.session.flush()
                return Response({"detail": "Invalid session. Please log in again."}, status=status.HTTP_401_UNAUTHORIZED)

            # Everything OK — serialize & return user + optional session expiry metadata
            serialized = SafeUserSerializer(user, context={"request": request}).data
            resp = {"user": serialized}

            # If session exists, include expiry metadata
            if getattr(request, "session", None):
                seconds, expires_at = _get_session_expiry_info(request)
                if seconds is not None:
                    resp["session_expires_in"] = seconds
                if expires_at is not None:
                    resp["session_expires_at"] = expires_at

            return Response(resp, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("Failed to serialize current user")
            return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LogoutAPIView(APIView):
    """
    POST /api/auth/logout/ - supports token logout (Authorization: Token <key>) and session logout.
    """
    # allow token or session
    authentication_classes = ([TokenAuthentication] if HAS_DRF_TOKEN else [])

    def post(self, request, *args, **kwargs):
        try:
            user = getattr(request, "user", None)
            auth = getattr(request, "auth", None)  # Token instance when using TokenAuthentication

            print(user, auth)

            if not user or not getattr(user, "is_authenticated", False):
                return Response({"detail": "Not logged in."}, status=status.HTTP_401_UNAUTHORIZED)

            # If request.auth is a Token instance, delete that token (logout for token auth)
            if HAS_DRF_TOKEN and auth is not None and hasattr(auth, "key"):
                try:
                    # Delete only the specific token used for this request
                    Token.objects.filter(key=getattr(auth, "key")).delete()
                except Exception:
                    logger.exception("Failed to delete token during logout for user %s", getattr(user, "email", "<unknown>"))

            # Also ensure session is cleared if present
            try:
                logout(request)
            except Exception:
                # logout may be no-op if session auth wasn't used; ignore non-fatal
                logger.debug("logout(request) during token logout may be non-fatal", exc_info=True)

            response = Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)

            # Optionally delete session cookie server-side — saves client-side cleanup if cookie present
            cookie_name = getattr(settings, "SESSION_COOKIE_NAME", "sessionid")
            response.delete_cookie(
                cookie_name,
                path=getattr(settings, "SESSION_COOKIE_PATH", "/"),
                domain=getattr(settings, "SESSION_COOKIE_DOMAIN", None),
            )
            return response

        except Exception:
            logger.exception("Unexpected logout error")
            return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CsrfTokenAPIView(APIView):
    """
    GET /api/auth/csrf/  -> returns a CSRF token for SPA clients to set X-CSRFToken header.
    The GET will ensure a CSRF cookie is set by calling get_token(request).
    """
    authentication_classes = []  # allow anonymous (CSRF token is safe to request)
    permission_classes = []

    def get(self, request, *args, **kwargs):
        try:
            token = get_token(request)
            return Response({"csrf_token": token}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Failed to obtain csrf token")
            return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
