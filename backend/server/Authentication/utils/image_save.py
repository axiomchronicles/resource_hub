# users/utils/image_save.py
from pathlib import Path
import tempfile
import shutil
from typing import Dict, Any
import secrets
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from PIL import Image
except Exception:
    Image = None

try:
    import magic as magiclib
except Exception:
    magiclib = None

MAX_PROFILE_SIZE = getattr(settings, "MAX_PROFILE_PIC_SIZE", 10 * 1024 * 1024)
ALLOWED_EXTENSIONS = getattr(settings, "ALLOWED_PROFILE_EXT", {"jpg", "jpeg", "png", "webp", "gif"})
ALLOWED_MIME_PREFIX = "image/"
IMAGE_MAX_DIM = getattr(settings, "IMAGE_MAX_DIM", 1024)


def _valid_extension(filename: str) -> bool:
    ext = Path(filename).suffix.lower().lstrip(".")
    return ext in ALLOWED_EXTENSIONS


def _detect_mime(path: Path) -> str | None:
    if magiclib is None:
        return None
    try:
        m = magiclib.Magic(mime=True)
        return m.from_file(str(path))
    except Exception:
        logger.exception("python-magic mime detection failed")
        return None


def normalize_image(path: Path) -> None:
    if Image is None:
        return
    try:
        with Image.open(path) as im:
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            w, h = im.size
            if max(w, h) > IMAGE_MAX_DIM:
                scale = IMAGE_MAX_DIM / max(w, h)
                im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            fmt = im.format or "JPEG"
            im.save(path, format=fmt, quality=85, optimize=True)
    except Exception:
        logger.exception("Failed to normalize image %s", path)


def save_uploaded_file(uploaded_file, upload_dir: Path) -> Dict[str, Any]:
    """
    Synchronous helper to save uploaded_file (Django UploadedFile) to disk atomically.
    Designed to be run in a thread (async views should call via asyncio.to_thread).
    Returns metadata dict with filepath, filename, size, content_type.
    """
    upload_dir.mkdir(parents=True, exist_ok=True)
    orig = getattr(uploaded_file, "name", "upload")
    if not _valid_extension(orig):
        raise ValueError("Invalid file extension")

    tmp = tempfile.NamedTemporaryFile(delete=False, dir=upload_dir)
    tmp_name = Path(tmp.name)
    size = 0
    try:
        for chunk in uploaded_file.chunks():
            tmp.write(chunk)
            size += len(chunk)
            if size > MAX_PROFILE_SIZE:
                tmp.close()
                tmp_name.unlink(missing_ok=True)
                raise ValueError("File exceeds allowed size")
        tmp.flush()
        tmp.close()

        mime = _detect_mime(tmp_name) if magiclib is not None else uploaded_file.content_type
        if mime and not mime.startswith(ALLOWED_MIME_PREFIX):
            tmp_name.unlink(missing_ok=True)
            raise ValueError("Uploaded file is not a valid image")

        normalize_image(tmp_name)

        ext = tmp_name.suffix or Path(orig).suffix or ".jpg"
        final_name = f"{secrets.token_hex(16)}{ext}"
        final_path = upload_dir / final_name
        shutil.move(str(tmp_name), str(final_path))

        return {
            "name": final_name,
            "path": str(final_path),
            "original_filename": orig,
            "size": final_path.stat().st_size,
            "content_type": mime or "",
        }
    finally:
        if tmp_name.exists():
            try:
                tmp_name.unlink(missing_ok=True)
            except Exception:
                pass
