# users/models.py
from __future__ import annotations
from typing import Optional
import uuid
from datetime import timedelta
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
import logging

logger = logging.getLogger(__name__)


# ---------------------------
# Audit + SoftDelete Base
# ---------------------------
class AuditModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        abstract = True

    def soft_delete(self) -> None:
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])


# ---------------------------
# User Manager
# ---------------------------
class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: Optional[str], **extra_fields):
        if not email:
            raise ValueError("The given email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: Optional[str] = None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str, **extra_fields):
        """
        Create and save a superuser with the given email and password.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


# ---------------------------
# User Model (now full AUTH_USER_MODEL)
# ---------------------------
class User(AbstractBaseUser, PermissionsMixin, AuditModel):
    """
    API user model and project AUTH_USER_MODEL.
    PermissionsMixin gives is_superuser, groups, user_permissions fields and methods.
    """
    class CourseYear(models.IntegerChoices):
        YEAR_1 = 1, "1st Year"
        YEAR_2 = 2, "2nd Year"
        YEAR_3 = 3, "3rd Year"
        YEAR_4 = 4, "4th Year"
        OTHER = 99, "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True, db_index=True)
    last_name = models.CharField(max_length=150, blank=True, db_index=True)
    phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(r"^\+?\d{7,20}$", message="Enter a valid phone number.")],
    )
    university = models.CharField(max_length=255, blank=True)
    course = models.CharField(max_length=255, blank=True)
    year = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(99)],
        choices=CourseYear.choices,
    )
    dob = models.DateField(null=True, blank=True)
    consent = models.BooleanField(default=False)

    # Required for Django admin/permissions compatibility
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False, db_index=True)      # admin site flag
    is_superuser = models.BooleanField(default=False, db_index=True)  # from PermissionsMixin
    is_email_verified = models.BooleanField(default=False, db_index=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["is_email_verified"]),
        ]

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_full_name(self) -> str:  # compatibility with Django admin / utils
        return self.full_name

    def get_short_name(self) -> str:
        return self.first_name or self.email

    def age(self) -> Optional[int]:
        if not self.dob:
            return None
        today = timezone.now().date()
        years = today.year - self.dob.year - ((today.month, today.day) < (self.dob.month, self.dob.day))
        return years


# ---------------------------
# Profile + ProfilePic
# ---------------------------
def profile_upload_to(instance, filename):
    uid = instance.user.id if getattr(instance, "user_id", None) else uuid.uuid4()
    return f"profile/{uid}/{filename}"


class Profile(AuditModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    bio = models.TextField(blank=True)
    updated_via = models.CharField(max_length=32, blank=True, help_text="source that last updated profile")

    class Meta:
        verbose_name = "profile"
        verbose_name_plural = "profiles"

    def __str__(self) -> str:
        return f"Profile({self.user.email})"


class ProfilePic(AuditModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile_pic")
    file = models.ImageField(upload_to=profile_upload_to, max_length=500)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=128, blank=True)
    size = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "profile picture"
        verbose_name_plural = "profile pictures"

    def __str__(self) -> str:
        return f"ProfilePic({self.user.email})"

    def delete(self, using=None, keep_parents=False):
        storage = self.file.storage
        path = self.file.name
        super().delete(using=using, keep_parents=keep_parents)
        try:
            if path and storage.exists(path):
                storage.delete(path)
        except Exception:
            logger.exception("Failed to delete profile image file %s", path)


# ---------------------------
# OTP Model
# ---------------------------
class OTP(AuditModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otps")
    code = models.CharField(max_length=6, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0, help_text="Number of verification attempts")

    class Meta:
        unique_together = ("user", "code")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["code", "expires_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"OTP({self.user.email} / {self.code})"

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @classmethod
    def create_for_user(cls, user: User, ttl_minutes: int = 10, code: Optional[str] = None) -> "OTP":
        from secrets import randbelow
        if code is None:
            code = f"{randbelow(10**6):06d}"
        expires = timezone.now() + timedelta(minutes=ttl_minutes)
        return cls.objects.create(user=user, code=code, expires_at=expires)

    def mark_verified(self) -> None:
        self.is_verified = True
        self.save(update_fields=["is_verified"])

