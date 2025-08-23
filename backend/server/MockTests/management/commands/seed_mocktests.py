# mocktests/management/commands/seed_mocktests.py
from __future__ import annotations
import random
import uuid
from typing import List, Dict, Any

from django.core.management.base import BaseCommand
from django.db import transaction, models
from django.contrib.auth import get_user_model

from MockTests.models import MockTest, Question, TestAttempt, Answer, Difficulty


TESTS: List[Dict[str, Any]] = [
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "title": "Data Structures & Algorithms Fundamentals",
        "subject": "Computer Science",
        "duration": 60,
        "difficulty": Difficulty.MEDIUM,
        "topics": ["Arrays", "Linked Lists", "Trees", "Sorting", "Searching"],
        "description": "Test your understanding of basic data structures and algorithms",
        "questions": [
            {
                "id": uuid.UUID("11111111-1111-1111-1111-000000000001"),
                "order": 1,
                "question": "What is the time complexity of binary search?",
                "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
                "correct_answer": 1,
                "explanation": "Binary search halves the search space each step, hence O(log n).",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Searching",
            },
            {
                "id": uuid.UUID("11111111-1111-1111-1111-000000000002"),
                "order": 2,
                "question": "Which data structure uses LIFO (Last In, First Out) principle?",
                "options": ["Queue", "Stack", "Array", "Linked List"],
                "correct_answer": 1,
                "explanation": "Stack follows LIFO.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Data Structures",
            },
            {
                "id": uuid.UUID("11111111-1111-1111-1111-000000000003"),
                "order": 3,
                "question": "What is the average-case time complexity of quicksort?",
                "options": ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
                "correct_answer": 1,
                "explanation": "Average-case quicksort partitions well giving O(n log n).",
                "difficulty": Difficulty.MEDIUM,
                "subject": "Computer Science",
                "topic": "Sorting",
            },
            {
                "id": uuid.UUID("11111111-1111-1111-1111-000000000004"),
                "order": 4,
                "question": "Which traversal of a BST yields nodes in sorted order?",
                "options": ["Pre-order", "In-order", "Post-order", "Level-order"],
                "correct_answer": 1,
                "explanation": "In-order traversal of a BST visits nodes in ascending key order.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Trees",
            },
            {
                "id": uuid.UUID("11111111-1111-1111-1111-000000000005"),
                "order": 5,
                "question": "Which data structure is typically used to implement BFS?",
                "options": ["Stack", "Queue", "Heap", "Set"],
                "correct_answer": 1,
                "explanation": "BFS explores level by level using a queue.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Graphs",
            },
            {
                "id": uuid.UUID("11111111-1111-1111-1111-000000000006"),
                "order": 6,
                "question": "Expected average lookup time in a hash table (with good hash)?",
                "options": ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
                "correct_answer": 2,
                "explanation": "With low load factor and uniform hashing, average lookup is O(1).",
                "difficulty": Difficulty.MEDIUM,
                "subject": "Computer Science",
                "topic": "Hashing",
            },
        ],
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
        "title": "Object-Oriented Programming Concepts",
        "subject": "Computer Science",
        "duration": 45,
        "difficulty": Difficulty.EASY,
        "topics": ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
        "description": "Master the core concepts of object-oriented programming",
        "questions": [
            {
                "id": uuid.UUID("22222222-2222-2222-2222-000000000001"),
                "order": 1,
                "question": "Which OOP principle hides internal details and shows only functionality?",
                "options": ["Encapsulation", "Abstraction", "Polymorphism", "Inheritance"],
                "correct_answer": 1,
                "explanation": "Abstraction exposes essentials and hides implementation.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Abstraction",
            },
            {
                "id": uuid.UUID("22222222-2222-2222-2222-000000000002"),
                "order": 2,
                "question": "What allows a subclass to provide a specific implementation of a superclass method?",
                "options": ["Overloading", "Overriding", "Shadowing", "Hiding"],
                "correct_answer": 1,
                "explanation": "Overriding replaces the inherited method's behavior.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Polymorphism",
            },
            {
                "id": uuid.UUID("22222222-2222-2222-2222-000000000003"),
                "order": 3,
                "question": "Which relationship best represents 'is-a'?",
                "options": ["Association", "Aggregation", "Composition", "Inheritance"],
                "correct_answer": 3,
                "explanation": "Inheritance models an is-a relationship.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Inheritance",
            },
            {
                "id": uuid.UUID("22222222-2222-2222-2222-000000000004"),
                "order": 4,
                "question": "Encapsulation primarily helps with which of the following?",
                "options": ["Code generation", "Data hiding", "Multiple inheritance", "Operator overloading"],
                "correct_answer": 1,
                "explanation": "Encapsulation bundles data and methods, enabling information hiding.",
                "difficulty": Difficulty.MEDIUM,
                "subject": "Computer Science",
                "topic": "Encapsulation",
            },
            {
                "id": uuid.UUID("22222222-2222-2222-2222-000000000005"),
                "order": 5,
                "question": "True/False: Polymorphism lets the same interface call different implementations at runtime.",
                "options": ["True", "False"],
                "correct_answer": 0,
                "explanation": "Dynamic dispatch selects the appropriate implementation.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Polymorphism",
            },
            {
                "id": uuid.UUID("22222222-2222-2222-2222-000000000006"),
                "order": 6,
                "question": "Which of these is NOT an OOP pillar?",
                "options": ["Encapsulation", "Abstraction", "Polymorphism", "Recursion"],
                "correct_answer": 3,
                "explanation": "Recursion is a programming technique, not an OOP pillar.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Basics",
            },
        ],
    },
    {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
        "title": "Advanced Database Systems",
        "subject": "Computer Science",
        "duration": 90,
        "difficulty": Difficulty.HARD,
        "topics": ["SQL", "Normalization", "Indexing", "Transactions", "Optimization"],
        "description": "Comprehensive test on database design and optimization",
        "questions": [
            {
                "id": uuid.UUID("33333333-3333-3333-3333-000000000001"),
                "order": 1,
                "question": "Which normal form removes transitive dependencies?",
                "options": ["1NF", "2NF", "3NF", "BCNF"],
                "correct_answer": 2,
                "explanation": "3NF ensures non-key attributes are not transitively dependent on the key.",
                "difficulty": Difficulty.MEDIUM,
                "subject": "Computer Science",
                "topic": "Normalization",
            },
            {
                "id": uuid.UUID("33333333-3333-3333-3333-000000000002"),
                "order": 2,
                "question": "A clustered index determines the physical order of rows in a table.",
                "options": ["True", "False"],
                "correct_answer": 0,
                "explanation": "Clustered indexes store rows in index order in most DBMS.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Indexing",
            },
            {
                "id": uuid.UUID("33333333-3333-3333-3333-000000000003"),
                "order": 3,
                "question": "In ACID, what does 'I' stand for?",
                "options": ["Isolation", "Integrity", "Idempotence", "Indexing"],
                "correct_answer": 0,
                "explanation": "ACID stands for Atomicity, Consistency, Isolation, Durability.",
                "difficulty": Difficulty.EASY,
                "subject": "Computer Science",
                "topic": "Transactions",
            },
            {
                "id": uuid.UUID("33333333-3333-3333-3333-000000000004"),
                "order": 4,
                "question": "Which SQL clause filters records after aggregation?",
                "options": ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
                "correct_answer": 1,
                "explanation": "HAVING filters groups produced by GROUP BY.",
                "difficulty": Difficulty.MEDIUM,
                "subject": "Computer Science",
                "topic": "SQL",
            },
            {
                "id": uuid.UUID("33333333-3333-3333-3333-000000000005"),
                "order": 5,
                "question": "Which isolation level prevents dirty reads but allows non-repeatable reads?",
                "options": ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"],
                "correct_answer": 1,
                "explanation": "Read Committed disallows dirty reads but not all read anomalies.",
                "difficulty": Difficulty.MEDIUM,
                "subject": "Computer Science",
                "topic": "Transactions",
            },
            {
                "id": uuid.UUID("33333333-3333-3333-3333-000000000006"),
                "order": 6,
                "question": "Which index structure is typically best for range queries?",
                "options": ["Hash index", "B-Tree", "Bitmap", "GiST"],
                "correct_answer": 1,
                "explanation": "B-Trees maintain sorted order useful for ranges.",
                "difficulty": Difficulty.MEDIUM,
                "subject": "Computer Science",
                "topic": "Indexing",
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed dummy MockTests with questions. Optionally generate random attempts for users."

    def add_arguments(self, parser):
        parser.add_argument("--with-attempts", type=int, default=0, help="How many random attempts per test to create (distributed over users)")
        parser.add_argument("--users", nargs="*", help="Specific user emails to use for attempts. Defaults to all users (up to 50).")

    def handle(self, *args, **opts):
        created_tests = 0
        created_questions = 0

        with transaction.atomic():
            for test_data in TESTS:
                test_id = test_data["id"]
                defaults = {
                    "title": test_data["title"],
                    "subject": test_data["subject"],
                    "duration": test_data["duration"],
                    "difficulty": test_data["difficulty"],
                    "topics": test_data["topics"],
                    "description": test_data["description"],
                    "is_published": True,
                }
                test, created = MockTest.objects.update_or_create(id=test_id, defaults=defaults)
                created_tests += int(created)

                for q in test_data["questions"]:
                    q_defaults = {
                        "mock_test": test,
                        "order": q["order"],
                        "question": q["question"],
                        "options": q["options"],
                        "correct_answer": q["correct_answer"],
                        "explanation": q["explanation"],
                        "difficulty": q["difficulty"],
                        "subject": q["subject"],
                        "topic": q["topic"],
                    }
                    _, q_created = Question.objects.update_or_create(id=q["id"], defaults=q_defaults)
                    created_questions += int(q_created)

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(TESTS)} tests (new: {created_tests}) and {created_questions} questions."))

        # Optional attempts
        attempts_per_test: int = int(opts.get("with_attempts") or 0)
        if attempts_per_test > 0:
            User = get_user_model()
            emails = opts.get("users") or []

            if emails:
                users = list(User.objects.filter(email__in=emails))
            else:
                users = list(User.objects.all()[:50])

            if not users:
                # Create a demo user if none available
                demo, _ = User.objects.get_or_create(email="demo@example.com", defaults={"is_active": True})
                demo.set_unusable_password()
                demo.save(update_fields=["password"])
                users = [demo]

            # distribute attempts roughly evenly across users
            all_tests = list(MockTest.objects.all())
            total_created = 0
            with transaction.atomic():
                for test in all_tests:
                    for _ in range(attempts_per_test):
                        user = random.choice(users)
                        questions = list(test.questions.all().order_by("order", "created_at"))
                        if not questions:
                            continue
                        answers_map = {}
                        correct_count = 0
                        for q in questions:
                            # 70% chance to answer, 50% of those correct
                            if random.random() < 0.7:
                                if random.random() < 0.5:
                                    idx = q.correct_answer
                                else:
                                    # pick a wrong index
                                    wrong_choices = [i for i in range(len(q.options)) if i != q.correct_answer]
                                    idx = random.choice(wrong_choices)
                                answers_map[str(q.id)] = idx
                                correct_count += int(idx == q.correct_answer)
                            else:
                                # unanswered → mark with out-of-range sentinel for storage
                                answers_map[str(q.id)] = 9999

                        score = round((correct_count / len(questions)) * 100) if questions else 0
                        time_taken = min(test.duration * 60, int(random.uniform(0.4, 0.95) * test.duration * 60))
                        attempt = TestAttempt.objects.create(
                            user=user,
                            mock_test=test,
                            time_taken_seconds=time_taken,
                            score=score,
                            correct_count=correct_count,
                            total_questions=len(questions),
                        )
                        Answer.objects.bulk_create([
                            Answer(
                                attempt=attempt,
                                question=q,
                                selected_index=answers_map.get(str(q.id), 9999),
                                is_correct=(answers_map.get(str(q.id)) == q.correct_answer),
                            )
                            for q in questions
                        ])
                        total_created += 1

                    # update aggregates
                    agg = TestAttempt.objects.filter(mock_test=test).aggregate(avg_score=models.Avg("score"), cnt=models.Count("id"))
                    test.average_score = float(agg["avg_score"] or 0.0)
                    test.attempts = int(agg["cnt"] or 0) 
                    test.save(update_fields=["average_score", "attempts"])

            self.stdout.write(self.style.SUCCESS(f"Created {total_created} random attempts across {len(all_tests)} tests."))

        self.stdout.write(self.style.SUCCESS("Done."))
