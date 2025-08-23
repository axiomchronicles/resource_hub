# ─────────────────────────────────────────────────────────────────────────────
# mocktests/views.py
# ─────────────────────────────────────────────────────────────────────────────
from __future__ import annotations
from typing import Dict, Any

from django.db import transaction
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, decorators, response, status
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
import math

from .models import MockTest, Question, TestAttempt, Answer
from .serializers import (
    MockTestListSerializer,
    MockTestDetailSerializer,
    AttemptSerializer,
    AttemptResultSerializer,
)


class IsStaffOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):  # pragma: no cover
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class MockTestViewSet(viewsets.ReadOnlyModelViewSet):
    """List & retrieve public mock tests. Detail includes questions.

    Endpoints:
      - GET /api/mocktests/ (list without questions)
      - GET /api/mocktests/{id}/ (detail with questions)
      - POST /api/mocktests/{id}/submit/ (submit attempt)
    """

    parser_classes = [JSONParser, FormParser, MultiPartParser]

    queryset = (
        MockTest.objects.filter(is_published=True)
        .select_related("created_by")
        .order_by("-created_at")
    )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return MockTestDetailSerializer
        return MockTestListSerializer

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request: Request, pk: str | None = None):
        """Accept answers mapping and return evaluated results.

        Expected payload:
        {
          "answers": { "<question_id>": <index:int>, ... },
          "timeTaken": <seconds:int>
        }
        """
        test: MockTest = self.get_object()
        data = request.data or {}
        answers_map: Dict[str, int] = data.get("answers") or {}
        time_taken = int(data.get("timeTaken") or 0)

        # Validation: time taken should not vastly exceed test duration
        max_seconds = int(test.duration) * 60
        if time_taken < 0:
            time_taken = 0
        if time_taken > max_seconds * 3:  # generous upper bound to avoid rejects from clock drift
            time_taken = max_seconds

        questions = list(test.questions.all().order_by("order", "created_at"))
        total = len(questions)
        if total == 0:
            return response.Response({"detail": "No questions for this test."}, status=status.HTTP_400_BAD_REQUEST)

        correct_count = 0
        breakdown = []

        # Evaluate
        for q in questions:
            user_idx = answers_map.get(str(q.id))
            is_correct = user_idx is not None and int(user_idx) == int(q.correct_answer)
            if is_correct:
                correct_count += 1
            breakdown.append(
                {
                    "question": q.question,
                    "userAnswer": user_idx if user_idx is not None else None,
                    "correctAnswer": q.correct_answer,
                    "isCorrect": is_correct,
                    "explanation": q.explanation,
                }
            )

        # Emulate JS Math.round to match frontend exactly
        score = math.floor((correct_count / total) * 100 + 0.5)

        with transaction.atomic():
            attempt = TestAttempt.objects.create(
                user=request.user,
                mock_test=test,
                time_taken_seconds=time_taken,
                score=score,
                correct_count=correct_count,
                total_questions=total,
            )
            Answer.objects.bulk_create(
                [
                    Answer(
                        attempt=attempt,
                        question=q,
                        selected_index=(answers_map.get(str(q.id)) if answers_map.get(str(q.id)) is not None else 9999),
                        is_correct=(answers_map.get(str(q.id)) == q.correct_answer),
                    )
                    for q in questions
                ]
            )

            # Recompute aggregates for the test (accurate & concurrency-safe inside transaction)
            agg = TestAttempt.objects.filter(mock_test=test).aggregate(avg=Avg("score"), cnt=Count("id"))
            test.average_score = float(agg["avg"] or 0.0)
            test.attempts = int(agg["cnt"] or 0)
            test.save(update_fields=["average_score", "attempts"])

        result_payload = {
            "score": score,
            "correctAnswers": correct_count,
            "totalQuestions": total,
            "timeTaken": time_taken,
            "breakdown": breakdown,
        }
        serializer = AttemptResultSerializer(result_payload)
        return response.Response(serializer.data, status=status.HTTP_200_OK)


class AttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """List/retrieve the authenticated user's attempts."""

    serializer_class = AttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            TestAttempt.objects.filter(user=self.request.user)
            .select_related("mock_test")
            .order_by("-started_at")
        )


class MyProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request):
        qs = TestAttempt.objects.filter(user=request.user)
        agg = qs.aggregate(
            total_attempts=Count("id"),
            avg_score=Avg("score"),
        )
        # per-subject stats
        per_subject = (
            qs.values("mock_test__subject")
            .annotate(count=Count("id"), avg_score=Avg("score"))
            .order_by("mock_test__subject")
        )
        last_attempts = (
            qs.select_related("mock_test")
            .values(
                "id",
                "mock_test_id",
                "mock_test__title",
                "mock_test__subject",
                "score",
                "time_taken_seconds",
                "started_at",
            )
            .order_by("-started_at")[:5]
        )
        payload = {
            "totalAttempts": agg["total_attempts"] or 0,
            "averageScore": float(agg["avg_score"] or 0.0),
            "bySubject": [
                {
                    "subject": row["mock_test__subject"],
                    "attempts": row["count"],
                    "averageScore": float(row["avg_score"] or 0.0),
                }
                for row in per_subject
            ],
            "recent": list(last_attempts),
        }
        return response.Response(payload)
