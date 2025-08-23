# ─────────────────────────────────────────────────────────────────────────────
# mocktests/serializers.py
# ─────────────────────────────────────────────────────────────────────────────
from __future__ import annotations
from typing import Dict, Any

from django.db.models import Count
from rest_framework import serializers

from .models import MockTest, Question, TestAttempt, Answer


class QuestionSerializer(serializers.ModelSerializer):
    # Map to camelCase expected by frontend
    correctAnswer = serializers.IntegerField(source="correct_answer")

    class Meta:
        model = Question
        fields = [
            "id",
            "question",
            "options",
            "correctAnswer",
            "explanation",
            "difficulty",
            "subject",
            "topic",
        ]


class MockTestListSerializer(serializers.ModelSerializer):
    totalQuestions = serializers.SerializerMethodField()
    averageScore = serializers.FloatField(source="average_score")

    class Meta:
        model = MockTest
        fields = [
            "id",
            "title",
            "subject",
            "duration",
            "totalQuestions",
            "difficulty",
            "topics",
            "description",
            "attempts",
            "averageScore",
        ]

    def get_totalQuestions(self, obj: MockTest) -> int:
        # Use prefetched count if available
        if hasattr(obj, "questions__count"):
            return obj.questions__count  # type: ignore[attr-defined]
        return obj.questions.count()


class MockTestDetailSerializer(MockTestListSerializer):
    questions = QuestionSerializer(many=True)

    class Meta(MockTestListSerializer.Meta):
        fields = MockTestListSerializer.Meta.fields + ["questions"]


class AttemptAnswerBreakdownSerializer(serializers.Serializer):
    question = serializers.CharField()
    userAnswer = serializers.IntegerField(allow_null=True)
    correctAnswer = serializers.IntegerField()
    isCorrect = serializers.BooleanField()
    explanation = serializers.CharField(allow_blank=True)


class AttemptResultSerializer(serializers.Serializer):
    score = serializers.IntegerField()
    correctAnswers = serializers.IntegerField()
    totalQuestions = serializers.IntegerField()
    timeTaken = serializers.IntegerField()
    breakdown = AttemptAnswerBreakdownSerializer(many=True)


class AttemptSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="mock_test.title", read_only=True)
    subject = serializers.CharField(source="mock_test.subject", read_only=True)

    class Meta:
        model = TestAttempt
        fields = [
            "id",
            "mock_test",
            "title",
            "subject",
            "score",
            "correct_count",
            "total_questions",
            "time_taken_seconds",
            "started_at",
            "completed_at",
        ]
