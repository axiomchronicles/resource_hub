from aquilify.core.routing import rule

from .registerauth_hub import RegisterAuthHubView
from .verify.emailverification import EmailVerificationView

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
    rule("/register", RegisterAuthHubView.registerhub, name="register_auth_hub", methods=["POST"]),
    rule("/verify/email", EmailVerificationView.verify, name="email_verification", methods=["POST"]),
]
