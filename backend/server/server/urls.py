# project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from django.http import JsonResponse

def healthcheck(request):
    return JsonResponse({"status": "ok", "timestamp": str(__import__("django.utils.timezone").utils.timezone.now())})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("Authentication.urls", namespace="Authentication")),
    path("api/uploads/", include("Resources.urls", namespace = "Resources")),
    path("api/resources/", include("Notes.urls", namespace = "Notes")),
    # optionally mount other apps:
    # path("api/auth/", include("rest_framework.urls")),  # browsable login (if enabled)
    path("health/", healthcheck, name="healthcheck"),
]

# Serve media files in DEBUG (development only)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
