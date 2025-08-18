# resources/views.py
import os
import logging
import math
import uuid
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
        except Exception as exc:
            logger.exception("Resource create failed: %s", exc)
            return Response({"detail": "Failed to create resource."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        out = ResourceSerializer(resource, context={"request": request}).data
        return Response({"success": True, "resource": out}, status=status.HTTP_201_CREATED)
