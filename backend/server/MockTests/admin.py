
# ─────────────────────────────────────────────────────────────────────────────
# mocktests/admin.py
# ─────────────────────────────────────────────────────────────────────────────
from __future__ import annotations
from django.contrib import admin

from .models import MockTest, Question, TestAttempt, Answer


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ("order", "question", "correct_answer", "topic", "difficulty")
    ordering = ("order",)


@admin.register(MockTest)
class MockTestAdmin(admin.ModelAdmin):
    list_display = ("title", "subject", "difficulty", "duration", "attempts", "average_score", "is_published")
    list_filter = ("subject", "difficulty", "is_published")
    search_fields = ("title", "subject", "description")
    inlines = [QuestionInline]


@admin.register(TestAttempt)
class TestAttemptAdmin(admin.ModelAdmin):
    list_display = ("user", "mock_test", "score", "correct_count", "total_questions", "time_taken_seconds", "started_at")
    list_filter = ("score", "mock_test__subject")
    search_fields = ("user__email", "mock_test__title")


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("attempt", "question", "selected_index", "is_correct")
    list_filter = ("is_correct",)


# ─────────────────────────────────────────────────────────────────────────────
# OPTIONAL: mocktests/permissions.py (if you need fine-grained control later)
# ─────────────────────────────────────────────────────────────────────────────
# from rest_framework import permissions
# class IsOwner(permissions.BasePermission):
#     def has_object_permission(self, request, view, obj):
#         return getattr(obj, "user_id", None) == getattr(request.user, "id", None)


# ─────────────────────────────────────────────────────────────────────────────
# Example settings & wiring (add to your project; not a file to create verbatim)
# ─────────────────────────────────────────────────────────────────────────────
# INSTALLED_APPS += [
#     "rest_framework",
#     "mocktests",
# ]
# AUTH_USER_MODEL = "users.User"  # you already have this
# ROOT_URLCONF -> include("mocktests.urls") under your /api/ prefix
# urlpatterns = [
#     path("api/", include("mocktests.urls")),
# ]
