# main.py
import uvicorn
from starlette.applications import Starlette
from starlette.responses import JSONResponse, FileResponse
from starlette.routing import Route
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from uuid import uuid4
from datetime import datetime

# --- Fake in-memory storage ---
# --- Fake in-memory storage ---
RESOURCES = [
    {
        "id": str(uuid4()),
        "title": "Discrete Mathematics Notes",
        "description": "Comprehensive notes covering set theory, logic, and combinatorics.",
        "type": "Notes",
        "subject": "Math",
        "semester": "2",
        "course_code": "MATH101",
        "author": "John Doe",
        "file_url": "https://files.example.com/discrete_mathematics_notes.pdf",
        "thumbnail_url": None,
        "downloads": 12,
        "rating": 4.5,
        "tags": ["Exam Prep", "Important"],
        "upload_date": datetime.utcnow().isoformat(),
        "is_featured": True,
        "is_trending": True
    },
    {
        "id": str(uuid4()),
        "title": "Physics Lab Experiments",
        "description": "Detailed lab manual with step-by-step experimental procedures.",
        "type": "Lab Manual",
        "subject": "Physics",
        "semester": "3",
        "course_code": "PHY201",
        "author": "Alice Smith",
        "file_url": "https://files.example.com/physics_lab_manual.pdf",
        "thumbnail_url": None,
        "downloads": 8,
        "rating": 4.2,
        "tags": ["Semester 1", "Important"],
        "upload_date": datetime.utcnow().isoformat(),
        "is_featured": False,
        "is_trending": True
    },
    {
        "id": str(uuid4()),
        "title": "Data Structures PPT",
        "description": "PowerPoint slides covering arrays, linked lists, and trees.",
        "type": "Presentation",
        "subject": "Computer Science",
        "semester": "4",
        "course_code": "CS202",
        "author": "Mark Johnson",
        "file_url": "https://files.example.com/data_structures_ppt.pptx",
        "thumbnail_url": None,
        "downloads": 15,
        "rating": 4.8,
        "tags": ["Exam Prep"],
        "upload_date": datetime.utcnow().isoformat(),
        "is_featured": True,
        "is_trending": False
    },
    {
        "id": str(uuid4()),
        "title": "Previous Year Question Papers - CS",
        "description": "Collection of past 5 years' Computer Science question papers.",
        "type": "Question Papers",
        "subject": "Computer Science",
        "semester": "5",
        "course_code": "CS301",
        "author": "Jane Doe",
        "file_url": "https://files.example.com/cs_prev_year_papers.zip",
        "thumbnail_url": None,
        "downloads": 20,
        "rating": 4.7,
        "tags": ["Important", "Exam Prep"],
        "upload_date": datetime.utcnow().isoformat(),
        "is_featured": False,
        "is_trending": True
    }
]

COMMENTS = {}
USERS = {}
FAVORITES = {}
STATS = {
    "total_resources": len(RESOURCES),
    "total_users": 1,
    "total_downloads": sum(r["downloads"] for r in RESOURCES),
    "total_universities": len({"MIT", "Stanford", "IIT Delhi"})
}
SUBJECTS = ["Math", "Physics", "Computer Science"]
TAGS = ["Exam Prep", "Important", "Semester 1"]
UNIVERSITIES = ["MIT", "Stanford", "IIT Delhi"]


# --- Helper ---
def api_response(data, message="OK", status="success", pagination=None):
    return JSONResponse({
        "data": data,
        "message": message,
        "status": status,
        "pagination": pagination
    })

# --- API Handlers ---
async def get_resources(request: Request):
    params = dict(request.query_params)
    # You could add filtering logic here
    return api_response(RESOURCES)

async def get_resource(request: Request):
    resource_id = request.path_params["id"]
    resource = next((r for r in RESOURCES if r["id"] == resource_id), None)
    if not resource:
        return api_response(None, "Resource not found", "error")
    return api_response(resource)

async def upload_resource(request: Request):
    form = await request.form()
    # Normally you’d save files to storage here
    new_resource = {
        "id": str(uuid4()),
        "title": form.get("title"),
        "description": form.get("description"),
        "type": form.get("type"),
        "subject": form.get("subject"),
        "semester": form.get("semester"),
        "course_code": form.get("course_code"),
        "author": form.get("author"),
        "file_url": "https://files.example.com/" + form.get("title", "").replace(" ", "_"),
        "thumbnail_url": None,
        "downloads": 0,
        "rating": 0,
        "tags": form.getlist("tags"),
        "upload_date": datetime.utcnow().isoformat(),
        "is_featured": False,
        "is_trending": False
    }
    RESOURCES.append(new_resource)
    STATS["total_resources"] += 1
    return api_response(new_resource, "Resource uploaded")

async def delete_resource(request: Request):
    resource_id = request.path_params["id"]
    global RESOURCES
    RESOURCES = [r for r in RESOURCES if r["id"] != resource_id]
    return api_response(None, "Resource deleted")

async def download_resource(request: Request):
    resource_id = request.path_params["id"]
    STATS["total_downloads"] += 1
    # Just returning a placeholder file
    return FileResponse("placeholder.pdf", filename="resource.pdf")

# --- Search ---
async def search_resources(request: Request):
    q = request.query_params.get("q", "").lower()
    results = [r for r in RESOURCES if q in r["title"].lower()]
    return api_response(results)

async def search_suggestions(request: Request):
    q = request.query_params.get("q", "").lower()
    suggestions = list({r["title"] for r in RESOURCES if q in r["title"].lower()})
    return api_response(suggestions)

# --- Comments ---
async def get_comments(request: Request):
    resource_id = request.path_params["id"]
    return api_response(COMMENTS.get(resource_id, []))

async def add_comment(request: Request):
    resource_id = request.path_params["id"]
    data = await request.json()
    comment = {
        "id": str(uuid4()),
        "resource_id": resource_id,
        "user": {"id": "user1", "name": "Test User"},
        "content": data.get("content"),
        "rating": data.get("rating"),
        "created_at": datetime.utcnow().isoformat(),
        "replies": []
    }
    COMMENTS.setdefault(resource_id, []).append(comment)
    return api_response(comment, "Comment added")

# --- User ---
async def get_user_profile(request: Request):
    return api_response(USERS.get("user1", {
        "id": "user1",
        "name": "Test User",
        "email": "test@example.com",
        "university": "MIT",
        "semester": "5",
        "uploads_count": 0,
        "downloads_count": 0,
        "joined_date": datetime.utcnow().isoformat()
    }))

async def update_user_profile(request: Request):
    data = await request.json()
    USERS["user1"] = {**USERS.get("user1", {}), **data}
    return api_response(USERS["user1"], "Profile updated")

async def get_user_uploads(request: Request):
    return api_response(RESOURCES)

async def get_user_favorites(request: Request):
    return api_response(FAVORITES.get("user1", []))

async def toggle_favorite(request: Request):
    resource_id = request.path_params["id"]
    favs = FAVORITES.setdefault("user1", [])
    if resource_id in favs:
        favs.remove(resource_id)
    else:
        favs.append(resource_id)
    return api_response(None, "Favorite toggled")

# --- Analytics ---
async def get_stats(request: Request):
    return api_response(STATS)

async def get_trending(request: Request):
    trending = [r for r in RESOURCES if r["is_trending"]]
    return api_response(trending)

async def get_featured(request: Request):
    featured = [r for r in RESOURCES if r["is_featured"]]
    return api_response(featured)

# --- Categories ---
async def get_subjects(request: Request):
    return api_response(SUBJECTS)

async def get_tags(request: Request):
    return api_response(TAGS)

# --- University ---
async def get_universities(request: Request):
    return api_response(UNIVERSITIES)

# --- Routes ---
routes = [
    Route("/api/resources", get_resources, methods=["GET"]),
    Route("/api/resources/{id}", get_resource, methods=["GET"]),
    Route("/api/resources", upload_resource, methods=["POST"]),
    Route("/api/resources/{id}", delete_resource, methods=["DELETE"]),
    Route("/api/resources/{id}/download", download_resource, methods=["GET"]),

    Route("/api/search", search_resources, methods=["GET"]),
    Route("/api/search/suggestions", search_suggestions, methods=["GET"]),

    Route("/api/resources/{id}/comments", get_comments, methods=["GET"]),
    Route("/api/resources/{id}/comments", add_comment, methods=["POST"]),

    Route("/api/user/profile", get_user_profile, methods=["GET"]),
    Route("/api/user/profile", update_user_profile, methods=["PUT"]),
    Route("/api/user/uploads", get_user_uploads, methods=["GET"]),
    Route("/api/user/favorites", get_user_favorites, methods=["GET"]),
    Route("/api/user/favorites/{id}", toggle_favorite, methods=["POST"]),

    Route("/api/stats", get_stats, methods=["GET"]),
    Route("/api/trending", get_trending, methods=["GET"]),
    Route("/api/featured", get_featured, methods=["GET"]),

    Route("/api/subjects", get_subjects, methods=["GET"]),
    Route("/api/tags", get_tags, methods=["GET"]),
    Route("/api/universities", get_universities, methods=["GET"])
]

# --- App ---
app = Starlette(routes=routes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
