# users/urls.py
from django.urls import path
from . import views, login_view

app_name = "Authentication"

urlpatterns = [
    path("register/", views.RegisterAPIView.as_view(), name="register"),
    path("verify/email/", views.OTPVerifyAPIView.as_view(), name="verify-otp"),
    path("resend-otp/", views.ResendOTPAPIView.as_view(), name="resend-otp"),

    path("login/", login_view.LoginAPIView.as_view(), name="login"),
    path("me/", login_view.MeAPIView.as_view(), name="me"),
    path("logout/", login_view.LogoutAPIView.as_view(), name="logout"),
]
