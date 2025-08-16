from transutil import syncbit

class EmailVerification(syncbit.Schema):
    """
    Schema for email verification in the authentication system.
    """
    email: str = syncbit.fields.String(required=True, extras={"description": "The email address to verify."})
    otp: str = syncbit.fields.String(required=True, extras={"description": "The verification code sent to the user's email."})

class EmailVerificationResponse(syncbit.Schema):
    """
    Schema for the response after email verification.
    """
    success: bool = syncbit.fields.Boolean(required=True, extras={"description": "Indicates whether the email verification was successful."})

class EmailOtpResend(syncbit.Schema):
    """
    Schema for resending the email verification OTP.
    """
    email: str = syncbit.fields.String(required=True, extras={"description": "The email address to resend the verification OTP."})
    resend_count: int = syncbit.fields.Integer(required=False, default=0, extras={"description": "Count of how many times the OTP has been resent."})