from aquilify.core.routing import rule

from .core import ping, list_discussions, create_discussion, create_reply, get_thread_replies, like_thread, like_reply
# ROUTER configuration.

# The `ROUTER` list routes URLs to views.
# Examples:
# Function views
#     1. Add an import:  from my_app import views
#     2. Add a URL to ROUTER:  rule('/', views.home, name='home')
# Including another ROUTING
#     1. Import the include() function: from aquilify.core.routing import include, rule
#     2. Add a URL to ROUTER:  rule('/blog', include = include('blog.routing'))

ROUTER = [
    rule("/ping", ping, methods=["GET"]),
    rule("/discus", list_discussions, methods=["GET"]),
    rule("/discus", create_discussion, methods=["POST"]),
    rule("/{thread_id}/replies", create_reply, methods=["POST"]),
    rule("/{thread_id}/replies", get_thread_replies, methods=["GET"]),
    rule("/{thread_id}/like", like_thread, methods=["POST"]),
    rule("/{thread_id}/replies/{reply_id}/like", like_reply, methods=["POST"]),
]
