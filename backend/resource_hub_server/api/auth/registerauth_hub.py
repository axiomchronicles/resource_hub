from aquilify.wrappers import Request

from aquilify import (
    responses,
    shortcuts
)

class RegisterAuthHub:
    """
    Handles the registration of a new user in the Auth Hub.
    """

    async def registerhub(self, request: Request):
        formData = await request.form()
        print("Form Data:", formData)
        return {"message": "Registration successful"}, 201

RegisterAuthHubView = RegisterAuthHub()