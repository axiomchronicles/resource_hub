from aquilify.wrappers import Request
from aquilify import (
    responses,
    shortcuts
)       

from .models import (
    EmailVerification
)

class EmailVerification:
    """
    Handles the email verification process for users.
    """

    async def verify_email(self, request: Request):
        formData = await request.json()
        modelData = EmailVerification(**formData)
        print("Email Verification Data:", modelData)
        return responses.JsonResponse(
            content={"message": "Email verification successful"},
            status=200
        )
    
EmailVerificationView = EmailVerification()