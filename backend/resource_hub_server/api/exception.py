"""This module defines a base exception class for API-related errors."""
from __future__ import annotations  # noqa: F401        

class BaseApiException(Exception):
    """
    Base class for all API exceptions.
    """
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

    def to_dict(self):
        return {
            "error": self.message,
            "status_code": self.status_code
        }