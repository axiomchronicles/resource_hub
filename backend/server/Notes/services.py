import hashlib
import math
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

from django.conf import settings
from django.utils.text import get_valid_filename

from Resources.models import UploadSession, ResourceFile

# config
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB (adjust)
ALLOWED_MIME_PREFIXES = (
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml",
    "text/",
    "image/",
    "application/zip",
)

TMP_ROOT = Path(getattr(settings, "MEDIA_ROOT", "media")) / "tmp"


def ensure_allowed(mime: Optional[str], size: int):
    if size > MAX_FILE_SIZE:
        raise ValueError("File exceeds max size.")
    if mime and not any(mime.startswith(pref) for pref in ALLOWED_MIME_PREFIXES):
        raise ValueError("MIME type not allowed.")


def tmp_dir_for_session(upload_id: str) -> str:
    path = TMP_ROOT / upload_id
    path.mkdir(parents=True, exist_ok=True)
    return str(path)


def write_chunk(session: UploadSession, idx: int, chunk_file):
    """Write a single chunk to temp dir."""
    os.makedirs(session.temp_dir, exist_ok=True)
    target = Path(session.chunk_path(idx))
    with open(target, "wb") as out:
        for c in chunk_file.chunks():
            out.write(c)


def _sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def promote_session_to_resource_file(session: UploadSession) -> ResourceFile:
    """Assemble chunks and create a ResourceFile owned by session.owner."""
    # build a safe target path within MEDIA_ROOT using a temporary file
    temp_final_dir = Path(getattr(settings, "MEDIA_ROOT", "media")) / "assembled" / str(session.owner.pk)
    temp_final_dir.mkdir(parents=True, exist_ok=True)
    safe_name = get_valid_filename(session.filename)
    assembled_path = temp_final_dir / f"{uuid.uuid4()}_{safe_name}"

    session.assemble(str(assembled_path))

    sha = _sha256_of_file(assembled_path)

    rf = ResourceFile.objects.create(
        owner=session.owner,
        name=session.filename,
        size=session.size,
        mime_type=session.mime_type,
        sha256=sha,
    )

    # Move into the FileField (which will place it under uploads/<user>/<uuid>/<filename>)
    # Open the assembled file and save to FileField
    from django.core.files import File as DjangoFile

    with open(assembled_path, "rb") as fh:
        rf.file.save(safe_name, DjangoFile(fh), save=True)

    # cleanup assembled temp
    try:
        assembled_path.unlink(missing_ok=True)
    except Exception:
        pass

    return rf


def mime_to_type(mime: Optional[str], filename: Optional[str] = None, title: Optional[str] = None) -> str:
    """
    Guess frontend 'type' for UI icons:
      - 'notes' => PDFs / text documents
      - 'ppt'   => powerpoint mime or .pptx/.ppt
      - 'paper' => heuristics: title contains 'paper' or 'exam' or 'question'
      - 'other' => fallback
    """
    if mime:
        m = mime.lower()
        if "pdf" in m or m.startswith("text/") or "msword" in m:
            return "notes"
        if "powerpoint" in m or "presentation" in m or "ms-powerpoint" in m:
            return "ppt"
        if m.startswith("image/"):
            return "notes"
    if filename:
        fn = filename.lower()
        if fn.endswith((".pdf", ".doc", ".docx", ".txt")):
            return "notes"
        if fn.endswith((".ppt", ".pptx", ".key")):
            return "ppt"
    if title:
        t = title.lower()
        if any(k in t for k in ("paper", "exam", "question", "solution", "answer")):
            return "paper"
    return "other"