import time
import os
from typing import Dict, List, Any

BASE_ATTACH_DIR = "/tmp/community_attachments"
os.makedirs(BASE_ATTACH_DIR, exist_ok=True)

# -------------------------
# Dummy in-memory data store
# -------------------------
def now_ts():
    return int(time.time())

def friendly_ts(seconds_ago: int):
    if seconds_ago < 60:
        return f"{seconds_ago} seconds ago"
    if seconds_ago < 3600:
        return f"{seconds_ago // 60} minutes ago"
    if seconds_ago < 86400:
        return f"{seconds_ago // 3600} hours ago"
    return f"{seconds_ago // 86400} days ago"

_threads: List[Dict[str, Any]] = [
    {
        "id": "1",
        "title": "Best resources for Data Structures and Algorithms?",
        "content": "Hi everyone! I'm looking for comprehensive resources to study DSA. Can anyone recommend good books, videos, or practice platforms?",
        "author": "Alex Kumar",
        "authorId": "1",
        "authorAvatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
        "course": "Computer Science",
        "topic": "Data Structures",
        "created_at": now_ts() - 7200,
        "timestamp": friendly_ts(7200),
        "likes": 24,
        "replies_count": 2,
        "isLikedBy": set(),  # set of userIds
        "tags": ["DSA", "Study Tips", "Programming"],
        "attachment": None
    },
    {
        "id": "2",
        "title": "Physics formulas cheat sheet",
        "content": "Created a comprehensive physics formulas cheat sheet for semester 3. Covers mechanics, thermodynamics, and waves. Hope it helps!",
        "author": "Priya Singh",
        "authorId": "2",
        "authorAvatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
        "course": "Physics",
        "topic": "Study Materials",
        "created_at": now_ts() - 18000,
        "timestamp": friendly_ts(18000),
        "likes": 45,
        "replies_count": 1,
        "isLikedBy": set(["3"]),
        "tags": ["Physics", "Formulas", "Cheat Sheet"],
        "attachment": None
    },
    {
        "id": "3",
        "title": "Group study for upcoming exams?",
        "content": "Anyone interested in forming a study group for the upcoming mid-semester exams? We can meet online and cover topics together.",
        "author": "Rahul Sharma",
        "authorId": "3",
        "authorAvatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=rahul",
        "course": "Engineering",
        "topic": "Study Groups",
        "created_at": now_ts() - 86400,
        "timestamp": friendly_ts(86400),
        "likes": 18,
        "replies_count": 0,
        "isLikedBy": set(),
        "tags": ["Study Group", "Exams", "Collaboration"],
        "attachment": None
    }
]

_replies: Dict[str, List[Dict[str, Any]]] = {
    "1": [
        {
            "id": "1-1",
            "threadId": "1",
            "content": "I highly recommend 'Introduction to Algorithms' by CLRS. It's comprehensive and well-explained.",
            "author": "Sarah Wilson",
            "authorId": "4",
            "authorAvatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
            "created_at": now_ts() - 3600,
            "timestamp": friendly_ts(3600),
            "likes": 8,
            "isLikedBy": set()
        },
        {
            "id": "1-2",
            "threadId": "1",
            "content": "For practice, LeetCode and GeeksforGeeks are excellent platforms. Start with easy problems and gradually move to harder ones.",
            "author": "Mike Chen",
            "authorId": "5",
            "authorAvatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
            "created_at": now_ts() - 1800,
            "timestamp": friendly_ts(1800),
            "likes": 12,
            "isLikedBy": set(["1"])
        }
    ],
    "2": [
        {
            "id": "2-1",
            "threadId": "2",
            "content": "Thanks! This is super helpful.",
            "author": "Student B",
            "authorId": "6",
            "authorAvatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=studentb",
            "created_at": now_ts() - 7200,
            "timestamp": friendly_ts(7200),
            "likes": 2,
            "isLikedBy": set()
        }
    ]
}
