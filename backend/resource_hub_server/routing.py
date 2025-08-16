from aquilify.core.routing import rule, include
import views

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
    rule("/", views.homeview, name="homeview", methods=["GET"]),
    ## Authentication API's Routes
    rule("/api/auth", include=include("api.auth.routing"), name = "register_auth_hub", methods=["POST"]),
    rule("/api/discussions", include=include("api.discussions.routing"), name = "discussions_api"),
]
