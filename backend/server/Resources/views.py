# File: resources/views.py
import os
import logging
import math
import uuid
import shutil
import subprocess
from tempfile import NamedTemporaryFile, TemporaryDirectory
from typing import Optional

from django.conf import settings
from django.db import transaction
from rest_framework import permissions, status, throttling
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

try:
    from rest_framework.authtoken.models import Token
    from rest_framework.authentication import TokenAuthentication
    HAS_DRF_TOKEN = True
except Exception:
    Token = None
    TokenAuthentication = None
    HAS_DRF_TOKEN = False

# try to import PDF/office/image libs (optional; fallback strategies implemented)
try:
    # modern pypdf
    from pypdf import PdfReader
    _HAS_PYPDF = True
except Exception:
    try:
        # fallback to PyPDF2 name if installed differently
        from PyPDF2 import PdfFileReader as _PdfFileReader 
        _HAS_PYPDF = True
        PdfReader = lambda f: _PdfFileReader(f)
    except Exception:
        _HAS_PYPDF = False

try:
    from pptx import Presentation
    _HAS_PYTHON_PPTX = True
except Exception:
    _HAS_PYTHON_PPTX = False

try:
    from PIL import Image
    _HAS_PIL = True
except Exception:
    _HAS_PIL = False

# python-docx cannot report pages reliably; we will prefer converting to PDF using soffice if available
try:
    import docx
    _HAS_PYTHON_DOCX = True
except Exception:
    _HAS_PYTHON_DOCX = False

from .models import UploadSession, ResourceFile, Resource
from .serializers import (
    UploadInitiateSerializer,
    UploadChunkSerializer,
    ResourceFileUploadSerializer,
    ResourceCreateSerializer, 
    ResourceSerializer,
)
from .services import (
    ensure_allowed,
    tmp_dir_for_session,
    write_chunk,
    promote_session_to_resource_file,
    MAX_FILE_SIZE,
)

logger = logging.getLogger(__name__)


class BurstUploadThrottle(throttling.ScopedRateThrottle):
    scope = "uploads_burst"


class SustainedUploadThrottle(throttling.ScopedRateThrottle):
    scope = "uploads_sustained"


class UploadSimpleAPIView(APIView):
    """
    POST /api/uploads/simple
    multipart/form-data: file, filename?, mimeType?
    """
    authentication_classes = ([TokenAuthentication] if HAS_DRF_TOKEN else [])
    permission_classes = [permissions.IsAuthenticated]   # <-- add this
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [BurstUploadThrottle, SustainedUploadThrottle]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        filename = request.data.get("filename") or file.name
        mime = request.data.get("mimeType") or file.content_type
        size = file.size

        try:
            ensure_allowed(mime, size)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rf = ResourceFile.objects.create(
                owner=request.user,
                name=filename,
                size=size,
                mime_type=mime,
            )
            rf.file.save(f"{rf.file_id}_{filename}", file, save=True)

            # count pages/slides if possible
            try:
                pages = count_pages_for_filefield(rf.file, rf.mime_type)
                print(pages)
                if pages is not None:
                    rf.pages = pages
                    rf.save(update_fields=["pages"])
            except Exception:
                logger.exception("Failed to count pages after simple upload for rf=%s", rf.pk)

        except Exception as exc:
            logger.exception("Simple upload failed: %s", exc)
            return Response({"detail": "Failed to store file."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        data = ResourceFileUploadSerializer(rf, context={"request": request}).data
        data.update({"success": True})
        return Response(data, status=status.HTTP_201_CREATED)


class UploadInitiateAPIView(APIView):
    """
    POST /api/uploads/initiate
    JSON: { filename, mimeType, size, chunkSize? }
    → { uploadId }
    """
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = ([TokenAuthentication] if HAS_DRF_TOKEN else [])
    parser_classes = [JSONParser]
    throttle_classes = [BurstUploadThrottle, SustainedUploadThrottle]

    def post(self, request, *args, **kwargs):
        ser = UploadInitiateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        filename = ser.validated_data["filename"]
        mime = ser.validated_data.get("mimeType")
        size = ser.validated_data["size"]
        try:
            ensure_allowed(mime, size)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        chunk_size = ser.validated_data.get("chunkSize") or (5 * 1024 * 1024)
        total_chunks = int(math.ceil(size / chunk_size))

        upload_id = uuid.uuid4()
        temp_dir_abs = tmp_dir_for_session(str(upload_id))

        session = UploadSession.objects.create(
            id=upload_id,
            owner=request.user,
            filename=filename,
            mime_type=mime,
            size=size,
            total_chunks=total_chunks,
            temp_dir=temp_dir_abs,
            status=UploadSession.STATUS_UPLOADING,
        )
        return Response({"uploadId": str(session.id)}, status=status.HTTP_201_CREATED)


class UploadChunkAPIView(APIView):
    """
    POST /api/uploads/{uploadId}/chunk
    multipart/form-data: chunk (binary), chunkIndex, totalChunks
    """
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = ([TokenAuthentication] if HAS_DRF_TOKEN else [])
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [BurstUploadThrottle, SustainedUploadThrottle]

    def post(self, request, upload_id, *args, **kwargs):
        ser = UploadChunkSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        idx = ser.validated_data["chunkIndex"]
        total = ser.validated_data["totalChunks"]
        chunk = ser.validated_data["chunk"]

        session = UploadSession.objects.filter(id=upload_id, owner=request.user).first()
        if not session:
            return Response({"detail": "Upload session not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status not in (UploadSession.STATUS_UPLOADING, UploadSession.STATUS_INITIATED):
            return Response({"detail": f"Invalid session state: {session.status}"}, status=status.HTTP_400_BAD_REQUEST)

        if total != session.total_chunks:
            return Response({"detail": "totalChunks mismatch."}, status=status.HTTP_400_BAD_REQUEST)

        if idx < 0 or idx >= session.total_chunks:
            return Response({"detail": "chunkIndex out of range."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            write_chunk(session, idx, chunk)
            # optimistic increment; idempotency could check for existing file
            session.uploaded_chunks = min(session.uploaded_chunks + 1, session.total_chunks)
            session.save(update_fields=["uploaded_chunks", "updated_at"])
        except Exception as exc:
            logger.exception("Chunk write failed: %s", exc)
            return Response({"detail": "Failed to write chunk."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"ok": True}, status=status.HTTP_200_OK)


class UploadCompleteAPIView(APIView):
    """
    POST /api/uploads/{uploadId}/complete
    → { success, fileId, fileUrl, name, size, mimeType, sha256 }
    """
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = ([TokenAuthentication] if HAS_DRF_TOKEN else [])
    throttle_classes = [BurstUploadThrottle, SustainedUploadThrottle]

    def post(self, request, upload_id, *args, **kwargs):
        session = UploadSession.objects.filter(id=upload_id, owner=request.user).first()
        if not session:
            return Response({"detail": "Upload session not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.uploaded_chunks != session.total_chunks:
            return Response({"detail": "Upload incomplete."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rf = promote_session_to_resource_file(session)

            # count pages/slides for the assembled file
            try:
                pages = count_pages_for_filefield(rf.file, rf.mime_type)
                if pages is not None:
                    rf.pages = pages
                    rf.save(update_fields=["pages"])
            except Exception:
                logger.exception("Failed to count pages after assemble for rf=%s", getattr(rf, "pk", None))

        except Exception as exc:
            logger.exception("Assembly failed: %s", exc)
            return Response({"detail": "Failed to assemble file."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        data = ResourceFileUploadSerializer(rf, context={"request": request}).data
        data.update({"success": True})
        return Response(data, status=status.HTTP_200_OK)


class ResourceCreateAPIView(APIView):
    """
    POST /api/resources
    Body:
      {
        title, description, subject, semester, courseCode, tags,
        files: [{ fileId | fileUrl, name?, size?, mimeType? }]
      }
    → { success, resource: {...} }
    """
    authentication_classes = ([TokenAuthentication] if HAS_DRF_TOKEN else [])
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [BurstUploadThrottle, SustainedUploadThrottle]

    def post(self, request, *args, **kwargs):
        payload = request.data.copy()
        # accept courseCode as in frontend, map to course_code
        if "courseCode" in payload and "course_code" not in payload:
            payload["course_code"] = payload.pop("courseCode")

        ser = ResourceCreateSerializer(data=payload, context={"request": request})
        ser.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                resource = ser.save()

                # if resource.pages not set and first file has pages, set it
                try:
                    first_file = resource.files.first()
                    if first_file and getattr(first_file, "pages", None):
                        resource.pages = first_file.pages
                        resource.save(update_fields=["pages"])
                except Exception:
                    logger.exception("Failed to set resource.pages from first file for resource=%s", resource.pk)

        except Exception as exc:
            logger.exception("Resource create failed: %s", exc)
            return Response({"detail": "Failed to create resource."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        out = ResourceSerializer(resource, context={"request": request}).data
        return Response({"success": True, "resource": out}, status=status.HTTP_201_CREATED)


# --------------------------- helpers: counting & conversion ---------------------------

def _is_soffice_available() -> bool:
    """Return True if `soffice` (LibreOffice) is available on the PATH."""
    try:
        subprocess.run(["soffice", "--version"], capture_output=True, check=True)
        return True
    except Exception:
        return False


def _ensure_local_file_from_field(file_field) -> str:
    """
    Ensure the uploaded FileField is available on local disk; return a local path.
    If storage backend already exposes .path, return it. Otherwise stream to a temp file.
    Caller is responsible for removing the temp file if this function created it (we try to remove automatically).
    """
    # If FileField has .path attribute (local storage), use it
    try:
        path = file_field.path  # type: ignore
        if path and os.path.exists(path):
            return path
    except Exception:
        pass

    # fallback: read file into a NamedTemporaryFile and return that path
    tmp = NamedTemporaryFile(delete=False)
    try:
        file_field.open("rb")
        for chunk in file_field.chunks():
            tmp.write(chunk)
        tmp.flush()
        tmp.close()
        return tmp.name
    finally:
        try:
            file_field.close()
        except Exception:
            pass


def _convert_to_pdf_via_soffice(input_path: str, out_dir: str) -> Optional[str]:
    """
    Convert input (docx, odt, ppt, etc.) to PDF using `soffice --headless --convert-to pdf`.
    Returns path to converted pdf, or None on failure.
    """
    if not _is_soffice_available():
        return None

    try:
        subprocess.run(
            ["soffice", "--headless", "--convert-to", "pdf", "--outdir", out_dir, input_path],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        # conversion puts output in out_dir with same base name and .pdf ext
        pdf_name = os.path.splitext(os.path.basename(input_path))[0] + ".pdf"
        pdf_path = os.path.join(out_dir, pdf_name)
        if os.path.exists(pdf_path):
            return pdf_path
    except Exception as e:
        logger.exception("soffice conversion failed for %s: %s", input_path, e)
    return None


def _count_pdf_pages_local(path: str) -> Optional[int]:
    if not _HAS_PYPDF:
        logger.debug("pypdf not available; cannot count PDF pages.")
        return None
    try:
        with open(path, "rb") as f:
            reader = PdfReader(f)
            try:
                # pypdf: reader.pages is a list-like
                return len(reader.pages)
            except Exception:
                # older PyPDF2 interface
                if hasattr(reader, "getNumPages"):
                    return reader.getNumPages()
    except Exception as e:
        logger.exception("Failed to read PDF to count pages: %s", e)
    return None


def _count_pptx_slides_local(path: str) -> Optional[int]:
    if not _HAS_PYTHON_PPTX:
        logger.debug("python-pptx not available; cannot count PPTX slides.")
        return None
    try:
        prs = Presentation(path)
        # slides is an iterable
        return len(list(prs.slides))
    except Exception as e:
        logger.exception("Failed to count pptx slides: %s", e)
    return None


def _count_image_frames_local(path: str) -> Optional[int]:
    if not _HAS_PIL:
        logger.debug("Pillow not available; assuming 1 page for image.")
        return 1
    try:
        with Image.open(path) as img:
            # some formats (TIFF, GIF) may have multiple frames/pages
            if getattr(img, "n_frames", 1) > 1:
                return getattr(img, "n_frames", 1)
            return 1
    except Exception as e:
        logger.exception("Failed to inspect image frames: %s", e)
    return 1


def count_pages_for_filefield(file_field, mime_type: Optional[str]) -> Optional[int]:
    """
    Best-effort page/slide counting for a FileField (or file-like object) + mime type.
    Returns integer page count, or None if unknown.
    Strategy:
      - If PDF and pypdf is installed -> count PDF pages directly.
      - If PPTX and python-pptx installed -> count slides.
      - If image -> use Pillow to check frames (TIFF/GIF multi-page).
      - Else: try converting to PDF via soffice and count PDF pages.
      - Clean up temp files created.
    """
    local_path = None
    created_tmp = False
    try:
        local_path = _ensure_local_file_from_field(file_field)
        created_tmp = True  # we assume _ensure_local_file_from_field creates a temp when not local

        # Normalize mime/type strings lower-case for checks
        mt = (mime_type or "").lower()

        # 1) PDF
        if "pdf" in mt or local_path.lower().endswith(".pdf"):
            pages = _count_pdf_pages_local(local_path)
            if pages is not None:
                return pages

        # 2) PPTX
        if "presentation" in mt or "powerpoint" in mt or local_path.lower().endswith((".pptx", ".ppt")):
            # prefer python-pptx for .pptx; for .ppt try soffice conversion
            if local_path.lower().endswith(".pptx") and _HAS_PYTHON_PPTX:
                slides = _count_pptx_slides_local(local_path)
                if slides is not None:
                    return slides
            # fallthrough: try soffice conversion for ppt/pptx
            with TemporaryDirectory() as tmpdir:
                pdf_path = _convert_to_pdf_via_soffice(local_path, tmpdir)
                if pdf_path:
                    pages = _count_pdf_pages_local(pdf_path)
                    if pages is not None:
                        return pages

        # 3) DOCX / DOC / ODT / RTF / etc.
        if (
            "word" in mt
            or local_path.lower().endswith((".docx", ".doc", ".odt", ".rtf"))
            or local_path.lower().endswith((".doc",))
        ):
            # python-docx does not give page counts. convert to PDF via soffice and count.
            with TemporaryDirectory() as tmpdir:
                pdf_path = _convert_to_pdf_via_soffice(local_path, tmpdir)
                if pdf_path:
                    pages = _count_pdf_pages_local(pdf_path)
                    if pages is not None:
                        return pages
            # If no soffice available, there's no reliable pure-python page count for DOCX; return None.
            return None

        # 4) Images
        if mt.startswith("image/") or local_path.lower().endswith((".jpg", ".jpeg", ".png", ".tiff", ".tif", ".gif", ".bmp", ".webp")):
            return _count_image_frames_local(local_path)

        # 5) Other: try convert to PDF via soffice (covers spreadsheets and odd office files)
        with TemporaryDirectory() as tmpdir:
            pdf_path = _convert_to_pdf_via_soffice(local_path, tmpdir)
            if pdf_path:
                pages = _count_pdf_pages_local(pdf_path)
                if pages is not None:
                    return pages

    except Exception as e:
        logger.exception("count_pages_for_filefield failed: %s", e)
    finally:
        # cleanup temp local_path only if it was created by _ensure_local_file_from_field (i.e. not storage .path)
        try:
            # If file_field.path exists and equals local_path, do not remove; otherwise remove
            if local_path and not hasattr(file_field, "path"):
                # created tmp file: safe to remove
                try:
                    os.remove(local_path)
                except Exception:
                    pass
        except Exception:
            pass

    return None
