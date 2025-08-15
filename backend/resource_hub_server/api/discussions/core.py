from aquilify.wrappers import Request
from aquilify.responses import JsonResponse as JSONResponse
from aquilify.datastructure.core import UploadFile

import os
import time
import math

from .helpers import _generate_id
from .helpers import _serialize_thread, _serialize_reply

from .dummydata import _threads, _replies, BASE_ATTACH_DIR, now_ts

async def list_discussions(request: Request):
    """
    GET /api/discussions?page=1&pageSize=10&q=..&course=..&topic=..&sort=recent|trending|unanswered
    Response: { items: Thread[], meta: { page, pageSize, total, totalPages } }
    """
    params = request.query_params
    page = int(params.get("page", 1))
    page_size = int(params.get("pageSize", 10))
    q = params.get("q", "").strip().lower()
    course = params.get("course", "").strip()
    topic = params.get("topic", "").strip()
    sort = params.get("sort", "recent")
    user_id = params.get("userId", "")  # optional for isLiked

    # filter
    items = []
    for t in _threads:
        ok = True
        if q:
            ok = q in t["title"].lower() or q in t["content"].lower()
        if ok and course and course.lower() != "all":
            ok = t["course"].lower() == course.lower()
        if ok and topic:
            ok = t["topic"].lower() == topic.lower()
        if ok:
            items.append(t)

    # sort
    if sort == "recent":
        items.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    elif sort == "trending":
        # very simple trending: likes + replies
        items.sort(key=lambda x: (x.get("likes", 0) + x.get("replies_count", 0) * 0.5), reverse=True)
    elif sort == "unanswered":
        items = [it for it in items if it.get("replies_count", 0) == 0]

    total = len(items)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    serialized = [_serialize_thread(t, user_id) for t in page_items]
    return JSONResponse({"items": serialized, "meta": {"page": page, "pageSize": page_size, "total": total, "totalPages": total_pages}})

async def create_discussion(request: Request):
    """
    POST /api/discussions (multipart/form-data)
    Fields: title, content, authorId, authorName, course, topic, tags (JSON string)
    Optional: attachment file
    """
    form = await request.form()
    title = form.get("title", "").strip()
    content = form.get("content", "").strip()
    authorId = form.get("authorId", "").strip() or "anonymous"
    authorName = form.get("authorName", "Anonymous")
    course = form.get("course", "General")
    topic = form.get("topic", "Discussion")
    tags_raw = form.get("tags", "[]")
    try:
        tags = eval(tags_raw) if isinstance(tags_raw, str) else tags_raw
    except Exception:
        tags = []
    attachment_path = None

    # handle file
    file_field = None
    for k, v in form.multi_items():
        if isinstance(v, UploadFile):
            file_field = v
            break
    if isinstance(file_field, UploadFile):
        filename = f"{int(time.time())}_{file_field.filename}"
        save_path = os.path.join(BASE_ATTACH_DIR, filename)
        with open(save_path, "wb") as f:
            content_bytes = await file_field.read()
            f.write(content_bytes)
        attachment_path = save_path

    if not title or not content:
        return JSONResponse({"error": "title and content are required"}, status=400)

    new_id = _generate_id("t")
    created_at = now_ts()
    thread = {
        "id": new_id,
        "title": title,
        "content": content,
        "author": authorName,
        "authorId": authorId,
        "authorAvatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={authorName.replace(' ', '')}",
        "course": course,
        "topic": topic,
        "created_at": created_at,
        "timestamp": "Just now",
        "likes": 0,
        "replies_count": 0,
        "isLikedBy": set(),
        "tags": list(tags) if isinstance(tags, list) else [],
        "attachment": attachment_path
    }
    # prepend so it shows up on page 1 (recent)
    _threads.insert(0, thread)
    # return created item
    return JSONResponse({"item": _serialize_thread(thread)})

async def create_reply(request: Request):
    """
    POST /api/discussions/{thread_id}/replies
    JSON body: { content: str, authorId: str }
    """
    thread_id = request.path_params["thread_id"]
    data = await request.json()
    content = data.get("content", "").strip()
    authorId = data.get("authorId", "anonymous")
    authorName = data.get("authorName", "Anonymous")

    if not content:
        return JSONResponse({"error": "content required"}, status=400)
    thread = next((t for t in _threads if t["id"] == thread_id), None)
    if not thread:
        return JSONResponse({"error": "thread not found"}, status=404)

    rid = _generate_id("r")
    reply = {
        "id": rid,
        "threadId": thread_id,
        "content": content,
        "author": authorName,
        "authorId": authorId,
        "authorAvatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={authorName.replace(' ', '')}",
        "created_at": now_ts(),
        "timestamp": "Just now",
        "likes": 0,
        "isLikedBy": set()
    }
    _replies.setdefault(thread_id, []).append(reply)
    thread["replies_count"] = thread.get("replies_count", 0) + 1
    return JSONResponse({"item": _serialize_reply(reply)})

async def like_thread(request: Request):
    """
    POST /api/discussions/{thread_id}/like
    JSON body: { userId: string }
    toggles like and returns { likes: int, isLiked: bool }
    """
    thread_id = request.path_params["thread_id"]
    data = await request.json()
    user_id = data.get("userId", "")
    if not user_id:
        return JSONResponse({"error": "userId required"}, status=400)
    thread = next((t for t in _threads if t["id"] == thread_id), None)
    if not thread:
        return JSONResponse({"error": "thread not found"}, status=404)
    is_liked = user_id in thread.get("isLikedBy", set())
    if is_liked:
        thread["isLikedBy"].remove(user_id)
        thread["likes"] = max(0, thread.get("likes", 0) - 1)
        is_liked = False
    else:
        thread.setdefault("isLikedBy", set()).add(user_id)
        thread["likes"] = thread.get("likes", 0) + 1
        is_liked = True
    return JSONResponse({"likes": thread["likes"], "isLiked": is_liked})

async def like_reply(request: Request):
    """
    POST /api/discussions/{thread_id}/replies/{reply_id}/like
    JSON body: { userId: string }
    """
    thread_id = request.path_params["thread_id"]
    reply_id = request.path_params["reply_id"]
    data = await request.json()
    user_id = data.get("userId", "")
    if not user_id:
        return JSONResponse({"error": "userId required"}, status=400)
    replies = _replies.get(thread_id, [])
    reply = next((r for r in replies if r["id"] == reply_id), None)
    if not reply:
        return JSONResponse({"error": "reply not found"}, status=404)
    if user_id in reply.get("isLikedBy", set()):
        reply["isLikedBy"].remove(user_id)
        reply["likes"] = max(0, reply.get("likes", 0) - 1)
        is_liked = False
    else:
        reply.setdefault("isLikedBy", set()).add(user_id)
        reply["likes"] = reply.get("likes", 0) + 1
        is_liked = True
    return JSONResponse({"likes": reply["likes"], "isLiked": is_liked})

async def get_thread_replies(request: Request):
    thread_id = request.path_params["thread_id"]
    user_id = request.query_params.get("userId", "")
    replies = _replies.get(thread_id, [])
    serialized = [_serialize_reply(r, user_id) for r in replies]
    return JSONResponse({"items": serialized})

# small health check
async def ping(request: Request):
    return JSONResponse({"ok": True, "now": now_ts()})