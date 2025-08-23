# ─────────────────────────────────────────────────────────────────────────────
# mocktests/models.py
# ─────────────────────────────────────────────────────────────────────────────
from __future__ import annotations
import uuid
import math
from typing import List

from django.conf import settings
from django.db import models, transaction
from django.core.validators import MinValueValidator, MaxValueValidator


class Difficulty(models.TextChoices):
    EASY = "easy", "easy"
    MEDIUM = "medium", "medium"
    HARD = "hard", "hard"


class MockTest(models.Model):
    """A published mock test containing multiple questions.

    NOTE: `total_questions` and averages are computed from related data.
    Frontend expects camelCase keys; serializers will map names.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, db_index=True)
    subject = models.CharField(max_length=120, db_index=True)
    duration = models.PositiveIntegerField(help_text="Duration in minutes")
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, db_index=True)
    topics = models.JSONField(default=list, blank=True, help_text="List[str] of topics")
    description = models.TextField(blank=True)

    # Aggregates (updated on attempt submit)
    attempts = models.PositiveIntegerField(default=0)
    average_score = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)])

    is_published = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_mocktests"
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["subject", "difficulty"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.title} ({self.subject})"


class Question(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mock_test = models.ForeignKey(MockTest, on_delete=models.CASCADE, related_name="questions")
    order = models.PositiveIntegerField(default=0, help_text="Ordering within the test")

    question = models.TextField()
    options = models.JSONField(default=list, help_text="List[str] of options (2..12)")
    correct_answer = models.PositiveIntegerField(help_text="Index into options (0-based)")
    explanation = models.TextField(blank=True)

    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    subject = models.CharField(max_length=120, blank=True)
    topic = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["order", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["mock_test", "order"], name="uq_question_test_order"),
        ]

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):  # pragma: no cover (simple constraints)
        if not isinstance(self.options, list) or len(self.options) < 2:
            raise ValueError("Question.options must be a list of at least 2 options")
        if self.correct_answer < 0 or self.correct_answer >= len(self.options):
            raise ValueError("correct_answer must be a valid index into options")

    def __str__(self) -> str:  # pragma: no cover
        return f"Q{self.order}: {self.question[:60]}…"


class TestAttempt(models.Model):
    """A user's finished attempt of a MockTest."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="test_attempts")
    mock_test = models.ForeignKey(MockTest, on_delete=models.CASCADE, related_name="attempts_set")

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(auto_now=True)

    time_taken_seconds = models.PositiveIntegerField(default=0)
    score = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    correct_count = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["user", "started_at"]),
            models.Index(fields=["mock_test", "started_at"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Attempt({self.user_id}, {self.mock_test_id}, {self.score}%)"


class Answer(models.Model):
    """The answer selected for a specific question within an attempt."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")

    selected_index = models.PositiveIntegerField()
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ("attempt", "question")
        indexes = [
            models.Index(fields=["attempt", "question"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Answer({self.attempt_id}, Q={self.question_id}, idx={self.selected_index})"




