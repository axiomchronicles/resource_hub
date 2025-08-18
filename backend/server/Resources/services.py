# resources/services.py
import hashlib
import os
import shutil
from typing import Optional
from django.conf import settings
from django.core.files.base import File
from django.core.files.storage import default_storage
from django.db import transaction
from .models import UploadSession, ResourceFile


DEFAULT_ALLOWED_MIME = getattr(settings, "UPLOAD_ALLOWED_MIME", {
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
})
MAX_FILE_SIZE = getattr(settings, "UPLOAD_MAX_BYTES", 50 * 1024 * 1024)  # 50MB default
TMP_ROOT = getattr(settings, "UPLOAD_TMP_ROOT", "tmp")  # under MEDIA_ROOT/tmp


def ensure_allowed(mime: Optional[str], size: int):
    if size > MAX_FILE_SIZE:
        raise ValueError("File too large.")
    if mime and DEFAULT_ALLOWED_MIME and mime not in DEFAULT_ALLOWED_MIME:
        raise ValueError("Unsupported file type.")


def tmp_dir_for_session(upload_id: str) -> str:
    # returns absolute path on the storage filesystem for temp chunks
    base = os.path.join(settings.MEDIA_ROOT, TMP_ROOT, str(upload_id))
    os.makedirs(base, exist_ok=True)
    return base


def write_chunk(session: UploadSession, idx: int, incoming_file) -> None:
    # Save chunk to filesystem under MEDIA_ROOT/tmp/<session>/
    path = session.chunk_path(idx)
    # use plain filesystem write for speed
    with open(path, "wb") as f:
        for chunk in incoming_file.chunks():
            f.write(chunk)


def assemble_file(session: UploadSession) -> str:
    """
    Concatenate chunk_0.part ... chunk_{n-1}.part into a single file on disk.
    Returns the assembled absolute path. Computes sha256 simultaneously.
    """
    assembled_path = os.path.join(session.temp_dir, "assembled.bin")
    sha256 = hashlib.sha256()
    with open(assembled_path, "wb") as out:
        for idx in range(session.total_chunks):
            part = session.chunk_path(idx)
            if not os.path.exists(part):
                raise FileNotFoundError(f"Missing chunk {idx}")
            with open(part, "rb") as pf:
                while True:
                    buf = pf.read(1024 * 1024)
                    if not buf:
                        break
                    sha256.update(buf)
                    out.write(buf)
    # sanity size check
    if os.path.getsize(assembled_path) != session.size:
        raise ValueError("Assembled size mismatch.")
    return assembled_path, sha256.hexdigest()


@transaction.atomic
def promote_session_to_resource_file(session: UploadSession) -> ResourceFile:
    """
    Moves the assembled file into Django storage and creates a ResourceFile.
    Cleans up temp directory afterward.
    """
    assembled_path, sha256 = assemble_file(session)

    # Create ResourceFile with a deterministic name
    rf = ResourceFile(
        owner=session.owner,
        name=session.filename,
        size=session.size,
        mime_type=session.mime_type,
        sha256=sha256,
    )
    # Save into storage (S3/local/etc.)
    with open(assembled_path, "rb") as f:
        rf.file.save(f"{rf.file_id}_{session.filename}", File(f), save=True)
    rf.save()

    # Cleanup temp dir
    try:
        shutil.rmtree(session.temp_dir, ignore_errors=True)
    except Exception:
        pass

    session.status = UploadSession.STATUS_COMPLETED
    session.save(update_fields=["status", "updated_at"])

    return rf
