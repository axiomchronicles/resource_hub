from transutil import syncbit
from typing import Optional, Any

class Name(syncbit.Schema):
    """
    Schema for names used in the authentication system.
    """
    firstName: str = syncbit.fields.String(required=True, extras = {"description": "The first name of the user."})
    lastName: str = syncbit.fields.String(required=True, extras = {"description": "The last name of the user."})

class UserRegistrationModel(syncbit.Schema):
    """
    Schema for user details in the authentication system.
    """
    firstName: str = syncbit.fields.String(required=True, extras = {"description": "The first name of the user."})
    lastName: str = syncbit.fields.String(required=True, extras = {"description": "The last name of the user."})
    studentId: str = syncbit.fields.String(required=True, extras = {"description": "The unique student ID of the user."})
    email: str = syncbit.fields.String(required=True, extras = {"description": "The email address of the user."})
    dob: str = syncbit.fields.String(required=True, extras = {"description": "The date of birth of the user."})
    password: str = syncbit.fields.String(required=True, extras = {"description": "The password for the user account."})
    confirmPassword: str = syncbit.fields.String(required=True, extras = {"description": "Confirmation of the user's password."})
    university: str = syncbit.fields.String(required=True, extras = {"description": "The university the user is associated with."})
    course: str = syncbit.fields.String(required=True, extras = {"description": "The course the user is enrolled in."})
    year: int = syncbit.fields.String(required=True, extras = {"description": "The year of study the user is currently in."})
    phone: str = syncbit.fields.String(required=True, extras = {"description": "The phone number of the user."})
    consent: bool = syncbit.fields.String(required=True, extras = {"description": "User's consent for terms and conditions."})
    profilePic: Optional[Any] = syncbit.fields.Any(required=False, extras = {"description": "Optional profile picture of the user."}, none=True)
    gender: Optional[str] = syncbit.fields.String(required=False, extras = {"description": "The gender of the user."})