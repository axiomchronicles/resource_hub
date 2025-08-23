

# ─────────────────────────────────────────────────────────────────────────────
# mocktests/urls.py
# ─────────────────────────────────────────────────────────────────────────────
from __future__ import annotations
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import MockTestViewSet, AttemptViewSet, MyProgressView

app_name = "MockTests"

router = DefaultRouter()
router.register(r"mocktests", MockTestViewSet, basename="mocktest")
router.register(r"attempts", AttemptViewSet, basename="attempt")

urlpatterns = [
    path("", include(router.urls)),
    path("me/progress/", MyProgressView.as_view(), name="me-progress"),
]

