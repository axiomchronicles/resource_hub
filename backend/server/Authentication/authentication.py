# users/authentication.py
from __future__ import annotations

import logging
from typing import Optional, Tuple

from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.request import Request

from .models import User  # your UUID-PK User model

logger = logging.getLogger(__name__)


class UUIDSessionAuthentication(SessionAuthentication):
    """
    Session-based authentication that is explicit about using your UUID primary-key
    User model and performs extra sanity checks:
      - Ensures the lazily-authenticated user exists in your User table (useful if
        you have multiple user models or a custom backend).
      - Verifies the user is active.
      - Preserves DRF SessionAuthentication behavior (including CSRF checks for unsafe methods).

    Return value follows DRF convention: (user, auth) or None.
    """

    def authenticate(self, request: Request) -> Optional[Tuple[User, object]]:
        """
        Authenticate using Django session (super) and then validate/normalize
        the returned user to be an instance of your `users.models.User`.
        """
        result = super().authenticate(request)
        if result is None:
            # Not authenticated via session
            return None

        user, auth = result

        # If session existed but no user attached (shouldn't happen), treat as anonymous
        if isinstance(user, AnonymousUser):
            return None

        # If the user object is already an instance of your User model, just check active.
        if isinstance(user, User):
            if getattr(user, "is_active", True) is False:
                logger.info("Inactive user attempted auth: %s", getattr(user, "pk", "<unknown>"))
                raise AuthenticationFailed("User account is disabled.", code="user_inactive")
            return (user, auth)

        # Otherwise, try to re-fetch a canonical User instance using the primary key
        try:
            canonical_user = User.objects.get(pk=user.pk)
        except Exception:
            logger.exception("Authenticated user not found in User table (pk=%s)", getattr(user, "pk", "<unknown>"))
            raise AuthenticationFailed("Authenticated user not found.", code="user_not_found")

        if getattr(canonical_user, "is_active", True) is False:
            logger.info("Inactive user attempted auth: %s", getattr(canonical_user, "pk", "<unknown>"))
            raise AuthenticationFailed("User account is disabled.", code="user_inactive")

        return (canonical_user, auth)
