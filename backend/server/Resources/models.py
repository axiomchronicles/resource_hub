import os
import shutil
import uuid
from django.db import models, transaction
from django.utils import timezone
from django.utils.text import get_valid_filename
from django.conf import settings

User = settings.AUTH_USER_MODEL

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------

def user_upload_path(instance, filename):
    """
    Safe path: MEDIA_ROOT/uploads/<user_id>/<uuid>/<filename>
    - Each file gets a dedicated subfolder (by uuid)
    - Filename sanitized
    """
    owner = getattr(instance, "owner", None)
    owner_part = getattr(owner, "pk", "anon")
    safe_name = get_valid_filename(filename)
    uid = getattr(instance, "file_id", None) or uuid.uuid4()
    return f"uploads/{owner_part}/{uid}/{safe_name}"


# ----------------------------------------------------------------------
# Resource
# ----------------------------------------------------------------------

class Resource(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, related_name="resources", on_delete=models.CASCADE)

    title = models.CharField(max_length=512)
    description = models.TextField(blank=True)
    subject = models.CharField(max_length=128)
    semester = models.CharField(max_length=64)
    course_code = models.CharField(max_length=64, blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["owner"]),
            models.Index(fields=["subject"]),
            models.Index(fields=["course_code"]),
        ]

    def __str__(self):
        return f"{self.title} — {self.owner}"


# ----------------------------------------------------------------------
# ResourceFile
# ----------------------------------------------------------------------

class ResourceFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource = models.ForeignKey(
        Resource, related_name="files", on_delete=models.CASCADE,
        null=True, blank=True
    )
    owner = models.ForeignKey(User, related_name="uploaded_files", on_delete=models.CASCADE)

    file = models.FileField(upload_to=user_upload_path, blank=True, null=True)
    file_url = models.TextField(blank=True, null=True)  # external storage URL
    file_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    name = models.CharField(max_length=512)
    size = models.BigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=128, blank=True, null=True)
    sha256 = models.CharField(max_length=64, blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner"]),
            models.Index(fields=["file_id"]),
        ]
        unique_together = ("owner", "file_id")  # optional safeguard

    def __str__(self):
        return f"{self.name} ({self.file_id})"

    def save(self, *args, **kwargs):
        if self.resource and self.resource.owner_id != self.owner_id:
            raise ValueError("ResourceFile owner must match Resource owner")
        super().save(*args, **kwargs)

    def mark_verified(self, checksum: str):
        """Mark file as verified after checksum validation."""
        if checksum != self.sha256:
            raise ValueError("Checksum mismatch")
        self.is_verified = True
        self.save(update_fields=["is_verified"])


# ----------------------------------------------------------------------
# UploadSession
# ----------------------------------------------------------------------

class UploadSession(models.Model):
    """
    Manages chunked uploads before assembling into a ResourceFile.
    """
    STATUS_INITIATED = "initiated"
    STATUS_UPLOADING = "uploading"
    STATUS_COMPLETED = "completed"
    STATUS_ABORTED = "aborted"
    STATUS_CHOICES = [
        (STATUS_INITIATED, "Initiated"),
        (STATUS_UPLOADING, "Uploading"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_ABORTED, "Aborted"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, related_name="upload_sessions", on_delete=models.CASCADE)

    filename = models.CharField(max_length=512)
    mime_type = models.CharField(max_length=128, blank=True, null=True)
    size = models.BigIntegerField()

    total_chunks = models.PositiveIntegerField()
    uploaded_chunks = models.PositiveIntegerField(default=0)
    temp_dir = models.CharField(max_length=512)  # MEDIA_ROOT/tmp/<uuid>/
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_INITIATED)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner"]),
            models.Index(fields=["status"]),
        ]

    def chunk_path(self, idx: int) -> str:
        return os.path.join(self.temp_dir, f"chunk_{idx}.part")

    def assemble(self, target_path: str):
        """
        Assemble uploaded chunks into the final file atomically.
        """
        if self.status == self.STATUS_COMPLETED:
            raise ValueError("UploadSession already completed")
        if self.uploaded_chunks != self.total_chunks:
            raise ValueError("Not all chunks uploaded")

        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        with transaction.atomic():
            with open(target_path, "wb") as outfile:
                for i in range(self.total_chunks):
                    chunk_file = self.chunk_path(i)
                    if not os.path.exists(chunk_file):
                        raise ValueError(f"Missing chunk {i}")
                    with open(chunk_file, "rb") as infile:
                        shutil.copyfileobj(infile, outfile)

            # cleanup temp_dir after success
            shutil.rmtree(self.temp_dir, ignore_errors=True)

            self.status = self.STATUS_COMPLETED
            self.save(update_fields=["status", "updated_at"])

    def abort(self):
        """Abort session and cleanup partial data."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
        self.status = self.STATUS_ABORTED
        self.save(update_fields=["status", "updated_at"])
