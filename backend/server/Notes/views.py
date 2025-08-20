# api/views.py
import mimetypes
from uuid import UUID
from typing import List

from django.conf import settings
from django.db.models import (
    Q, Sum, Avg, Count, F, Value, OuterRef, Subquery, CharField
)
from django.db.models.functions import Coalesce
from django.http import FileResponse, HttpResponseRedirect, Http404
from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView

from Resources.models import Resource, ResourceFile, ResourceRating   # <- include ResourceRating
from .serializers import (
    ResourceSerializer, SearchResultSerializer,
    ResourceRateRequestSerializer, ResourceRatingSerializer
)
from .pagination import TwelveDefaultLimitPagination
from .services import mime_to_type


# -------------- helpers (unchanged) ----------------
def _human_bytes(n: int | None) -> str:
    if not n and n != 0:
        return "-"
    x = float(n)
    units = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while x >= 1024 and i < len(units) - 1:
        x /= 1024.0
        i += 1
    return f"{x:.1f} {units[i]}"

def _frame_ancestors_header() -> str:
    allowed = getattr(
        settings,
        "FRAME_ANCESTORS",
        ["'self'", "http://localhost:8080", "http://127.0.0.1:8080"]
    )
    return "frame-ancestors " + " ".join(allowed)

def _annotated_resource_qs():
    first_file_qs = ResourceFile.objects.filter(resource=OuterRef("pk")).order_by("created_at")
    return (
        Resource.objects.select_related("owner").prefetch_related("files")
        .annotate(
            total_downloads=Coalesce(Sum("files__downloads_count"), 0),
            avg_rating=Coalesce(Avg("ratings__value"), 0.0),
            ratings_total=Coalesce(Count("ratings"), 0),
            total_size_bytes=Coalesce(Sum("files__size"), 0),
            file_count=Coalesce(Count("files"), 0),
            first_file_url=Coalesce(
                Subquery(first_file_qs.values("file_url")[:1]),
                Value("", output_field=CharField()),  # ✅ force CharField
                output_field=CharField(),
            ),
            first_file_name=Coalesce(
                Subquery(first_file_qs.values("name")[:1]),
                Value("", output_field=CharField()),
                output_field=CharField(),
            ),
            first_file_mime=Coalesce(
                Subquery(first_file_qs.values("mime_type")[:1]),
                Value("", output_field=CharField()),
                output_field=CharField(),
            ),
        )
    )

# -------------- list/detail with user_rating annotation ----------------

class NotesListAPIView(generics.ListAPIView):
    serializer_class = ResourceSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = TwelveDefaultLimitPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "subject", "semester", "course_code"]
    ordering_fields = ["created_at", "downloads", "rating", "pages"]
    ordering = ["-created_at"]

    # Approximate chars per line (heuristic). Adjust to better match your frontend layout.
    _CHARS_PER_LINE = 100
    _NUM_LINES = 2

    def get_queryset(self):
        qs = _annotated_resource_qs()

        # add per-user rating if logged in
        if self.request.user.is_authenticated:
            sub = ResourceRating.objects.filter(
                resource=OuterRef("pk"),
                user=self.request.user
            ).values("value")[:1]
            qs = qs.annotate(user_rating=Subquery(sub))
        else:
            qs = qs.annotate(user_rating=Value(None))

        subject = self.request.query_params.get("subject")
        semester = self.request.query_params.get("semester")
        if subject and subject.lower() != "all":
            qs = qs.filter(subject__iexact=subject)
        if semester and semester.lower() != "all":
            qs = qs.filter(semester__iexact=semester)

        ordering = self.request.query_params.get("ordering")
        if ordering:
            desc = ordering.startswith("-")
            key = ordering.lstrip("-")
            if key == "downloads":
                qs = qs.order_by(("-" if desc else "") + "total_downloads", "-created_at")
            elif key == "rating":
                qs = qs.order_by(("-" if desc else "") + "avg_rating",
                                 ("-" if desc else "") + "rating_count",
                                 "-created_at")
            elif key == "pages":
                qs = qs.order_by(("-" if desc else "") + "total_size_bytes", "-created_at")
            elif key == "created_at":
                qs = qs.order_by(("-" if desc else "") + "created_at")
            else:
                qs = qs.order_by("-created_at")
        else:
            qs = qs.order_by("-created_at")

        return qs

    def _trim_description(self, text: str) -> str:
        """Trim text to an approximate number of lines (heuristic).
        Avoid cutting words in half and append ellipsis if trimmed.
        """
        if not text:
            return ""
        desc = text.strip()
        limit = self._CHARS_PER_LINE * self._NUM_LINES
        if len(desc) <= limit:
            return desc
        # Try not to cut mid-word: cut to limit then rsplit on last space
        truncated = desc[:limit].rsplit(" ", 1)[0]
        # If rsplit produced empty (no spaces), fallback to hard cut
        if not truncated:
            truncated = desc[:limit]
        return truncated.rstrip() + "..."

    def list(self, request, *args, **kwargs):
        """
        Overriding list() so we can post-process serialized data (trim description)
        while keeping pagination intact.
        """
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            data = list(serializer.data)  # make mutable copy
            for item in data:
                try:
                    # only trim if description exists and is a string
                    desc = item.get("description")
                    if isinstance(desc, str) and desc:
                        item["description"] = self._trim_description(desc)
                except Exception:
                    # swallow per-item errors so a single bad item won't break the whole list
                    continue
            return self.get_paginated_response(data)

        serializer = self.get_serializer(queryset, many=True)
        data = list(serializer.data)
        for item in data:
            try:
                desc = item.get("description")
                if isinstance(desc, str) and desc:
                    item["description"] = self._trim_description(desc)
            except Exception:
                continue
        return Response(data)


class NotesDetailAPIView(generics.RetrieveAPIView):
    serializer_class = ResourceSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "id"

    def get_queryset(self):
        qs = _annotated_resource_qs()
        if self.request.user.is_authenticated:
            sub = ResourceRating.objects.filter(
                resource=OuterRef("pk"),
                user=self.request.user
            ).values("value")[:1]
            qs = qs.annotate(user_rating=Subquery(sub))
        else:
            qs = qs.annotate(user_rating=Value(None))
        print(type(qs)) # <- force evaluation to avoid lazy queryset issues
        return qs


# -------------- preview + download unchanged from your last version --------------

# -------------- preview + download --------------

class NotePreviewAPIView(APIView):
    """
    GET /api/notes/<uuid>/preview?file_id=<uuid>
    Returns an inline FileResponse for embedding in an <iframe>.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        rid = kwargs.get("pk") or kwargs.get("id")
        try:
            uid = UUID(str(rid))
        except Exception:
            raise Http404

        res = get_object_or_404(Resource.objects.prefetch_related("files"), id=uid)

        file_id = request.query_params.get("file_id")
        rf = (ResourceFile.objects.filter(resource=res, file_id=file_id).first()
              if file_id else res.files.order_by("created_at").first())
        if not rf:
            raise Http404("No file found for this resource.")

        if rf.file_url:
            # External host decides headers; we hand control to it
            return HttpResponseRedirect(redirect_to=rf.file_url)
 
        if not rf.file:
            raise Http404("File not stored locally.")

        ctype = rf.mime_type or mimetypes.guess_type(rf.name)[0] or "application/octet-stream"
        resp = FileResponse(rf.file.open("rb"), content_type=ctype)
        resp["Content-Length"] = rf.size or ""
        resp["Content-Disposition"] = f'inline; filename="{rf.name}"'
        # Let your frontend embed in an iframe (Firefox complaint fix)
        resp["X-Frame-Options"] = "ALLOWALL"
        resp["Content-Security-Policy"] = _frame_ancestors_header()
        return resp


class NoteDownloadAPIView(APIView):
    """
    GET /api/notes/<uuid>/download?file_id=<uuid>
    - If first file has external file_url → 302 redirect
    - If stored locally → FileResponse with attachment
    - Increments atomic download counters (resource + file)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        rid = kwargs.get("pk") or kwargs.get("id")
        try:
            uid = UUID(str(rid))
        except Exception:
            raise Http404

        res = get_object_or_404(Resource.objects.prefetch_related("files"), id=uid)
        file_id = request.query_params.get("file_id")
        rf = (ResourceFile.objects.filter(resource=res, file_id=file_id).first()
              if file_id else res.files.order_by("created_at").first())
        if not rf:
            raise Http404("No file found for this resource.")

        # Atomic counters
        ResourceFile.objects.filter(pk=rf.pk).update(downloads_count=Coalesce(F("downloads_count"), 0) + 1)

        if rf.file_url:
            return HttpResponseRedirect(redirect_to=rf.file_url)

        if not rf.file:
            raise Http404("File not stored locally.")

        ctype = rf.mime_type or mimetypes.guess_type(rf.name)[0] or "application/octet-stream"
        response = FileResponse(rf.file.open("rb"), content_type=ctype)
        response["Content-Length"] = rf.size or ""
        response["Content-Disposition"] = f'attachment; filename="{rf.name}"'
        # (We leave frame headers out for downloads)
        return response

# -------------- rating endpoints ----------------

class ResourceRatingSummaryAPIView(APIView):
    """
    GET /api/notes/<uuid:id>/rating
    Returns { avg, count, histogram: {1..5}, user_rating }
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        rid = kwargs.get("id") or kwargs.get("pk")
        try:
            uid = UUID(str(rid))
        except Exception:
            raise Http404

        res = get_object_or_404(Resource, id=uid)

        # histogram with conditional aggregates (Django supports 'filter=' in Count)
        agg = res.ratings.aggregate(
            avg=Coalesce(Avg("value"), 0.0),
            count=Coalesce(Count("id"), 0),
            star_1=Coalesce(Count("id", filter=Q(value=1)), 0),
            star_2=Coalesce(Count("id", filter=Q(value=2)), 0),
            star_3=Coalesce(Count("id", filter=Q(value=3)), 0),
            star_4=Coalesce(Count("id", filter=Q(value=4)), 0),
            star_5=Coalesce(Count("id", filter=Q(value=5)), 0),
        )

        user_rating = None
        if request.user.is_authenticated:
            ur = ResourceRating.objects.filter(resource=res, user=request.user).values_list("value", flat=True).first()
            user_rating = ur if ur is not None else None

        return Response({
            "avg_rating": float(agg["avg"] or 0.0),
            "rating_count": int(agg["count"] or 0),
            "histogram": {
                "1": int(agg["star_1"] or 0),
                "2": int(agg["star_2"] or 0),
                "3": int(agg["star_3"] or 0),
                "4": int(agg["star_4"] or 0),
                "5": int(agg["star_5"] or 0),
            },
            "user_rating": user_rating,
        }, status=status.HTTP_200_OK)


class ResourceRateAPIView(APIView):
    """
    POST   /api/notes/<uuid:id>/rate   { "value": 1..5 }  -> upsert user's rating
    DELETE /api/notes/<uuid:id>/rate                     -> remove user's rating
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        rid = kwargs.get("id") or kwargs.get("pk")
        try:
            uid = UUID(str(rid))
        except Exception:
            raise Http404

        res = get_object_or_404(Resource, id=uid)

        ser = ResourceRateRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        value = ser.validated_data["value"]

        rating, _created = ResourceRating.objects.update_or_create(
            resource=res, user=request.user,
            defaults={"value": value}
        )

        # return updated summary
        agg = res.ratings.aggregate(avg=Coalesce(Avg("value"), 0.0), count=Coalesce(Count("id"), 0))
        return Response({
            "ok": True,
            "user_rating": rating.value,
            "avg_rating": float(agg["avg"] or 0.0),
            "rating_count": int(agg["count"] or 0),
        }, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        rid = kwargs.get("id") or kwargs.get("pk")
        try:
            uid = UUID(str(rid))
        except Exception:
            raise Http404

        res = get_object_or_404(Resource, id=uid)
        ResourceRating.objects.filter(resource=res, user=request.user).delete()

        agg = res.ratings.aggregate(avg=Coalesce(Avg("value"), 0.0), count=Coalesce(Count("id"), 0))
        return Response({
            "ok": True,
            "user_rating": None,
            "avg_rating": float(agg["avg"] or 0.0),
            "rating_count": int(agg["count"] or 0),
        }, status=status.HTTP_200_OK)

class SearchAPIView(APIView):
    """
    GET /api/search?q=...&limit=10&subject=&semester=
    Lightweight results for typeahead + chips.
    """
    permission_classes = [permissions.AllowAny]
 
    def get(self, request, *args, **kwargs):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response([], status=status.HTTP_200_OK)

        try:
            limit = int(request.query_params.get("limit", 10))
        except ValueError:
            limit = 10
        limit = max(1, min(limit, 100))

        subject = request.query_params.get("subject")
        semester = request.query_params.get("semester")

        qs = _annotated_resource_qs()

        if subject:
            qs = qs.filter(subject__iexact=subject)
        if semester:
            qs = qs.filter(semester__iexact=semester)

        qs = qs.filter(
            Q(title__icontains=q)
            | Q(description__icontains=q)
            | Q(subject__icontains=q)
            | Q(semester__icontains=q)
            | Q(tags__icontains=q)
        ).order_by("-created_at")[:limit]

        results: List[dict] = []
        for resource in qs:
            f = resource.files.first()
            # Build absolute URL if we have a local file
            if f and f.file and hasattr(f.file, "url"):
                abs_first_url = request.build_absolute_uri(f.file.url)
            else:
                abs_first_url = resource.first_file_url or None

            # Type for icon
            rtype = mime_to_type(
                getattr(resource, "first_file_mime", None),
                filename=getattr(resource, "first_file_name", None),
                title=resource.title,
            )

            # Preview snippet
            preview_text = (resource.description or "")[:220] or (getattr(resource, "first_file_name", "") or "")

            results.append(
                {
                    "id": resource.id,
                    "title": resource.title,
                    "type": rtype,
                    "subject": resource.subject,
                    "semester": resource.semester,
                    "preview": preview_text,
                    "first_file_url": abs_first_url,
                    "first_mime_type": getattr(resource, "first_file_mime", None),
                    "created_at": resource.created_at,
                    # New goodies:
                    "owner_name": (resource.owner.get_full_name() or resource.owner.username) if resource.owner_id else "Unknown",
                    "total_downloads": getattr(resource, "total_downloads", 0) or 0,
                    "avg_rating": getattr(resource, "avg_rating", 0.0) or 0.0,
                    "rating_count": getattr(resource, "rating_count", 0) or 0,
                    "total_size_bytes": getattr(resource, "total_size_bytes", 0) or 0,
                    "total_size_human": _human_bytes(getattr(resource, "total_size_bytes", 0) or 0),
                    "file_count": getattr(resource, "file_count", 0) or 0,
                }
            )

        ser = SearchResultSerializer(results, many=True)
        return Response(ser.data, status=status.HTTP_200_OK)