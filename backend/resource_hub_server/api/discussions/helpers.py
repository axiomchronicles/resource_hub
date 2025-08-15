import uuid
from typing import Dict, Any

def _generate_id(prefix="t"):
    return f"{prefix}-{uuid.uuid4().hex[:8]}"

def _serialize_thread(thread: Dict[str, Any], user_id: str = ""):
    t = dict(thread)
    t["likes"] = thread.get("likes", 0)
    t["replies"] = thread.get("replies_count", 0)
    t["isLiked"] = user_id in thread.get("isLikedBy", set())
    # remove internal 'isLikedBy' and 'created_at'
    t.pop("isLikedBy", None)
    t.pop("created_at", None)
    return t

def _serialize_reply(reply: Dict[str, Any], user_id: str = ""):
    r = dict(reply)
    r["isLiked"] = user_id in reply.get("isLikedBy", set())
    r.pop("isLikedBy", None)
    r.pop("created_at", None)
    return r
