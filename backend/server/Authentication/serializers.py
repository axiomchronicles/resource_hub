# users/serializers.py
from rest_framework import serializers
from .models import User, ProfilePic, OTP
from django.utils import timezone
from django.core.validators import validate_email
from django.contrib.auth import get_user_model
from typing import Any, Dict

from .models import User as UserModel

class RegisterSerializer(serializers.Serializer):
    firstName = serializers.CharField(max_length=150)
    lastName = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    password = serializers.CharField(write_only=True)
    confirmPassword = serializers.CharField(write_only=True)
    university = serializers.CharField(required=False, allow_blank=True)
    course = serializers.CharField(required=False, allow_blank=True)
    year = serializers.IntegerField(required=False, allow_null=True)
    dob = serializers.DateField(required=False, allow_null=True)
    consent = serializers.BooleanField(default=False)
    profilePic = serializers.ImageField(required=False, allow_null=True)

    def validate(self, data: dict[str, Any]) -> dict[str, Any]:
        if data.get("password") != data.get("confirmPassword"):
            raise serializers.ValidationError("Passwords do not match")
        return data


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    remember = serializers.BooleanField(required = False)

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        email = attrs.get("email")
        password = attrs.get("password")
        if not email or not password:
            raise serializers.ValidationError({"detail": "Email and password are required."})
        return attrs

class ProfilePicSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProfilePic
        fields = ("file_url", "original_filename", "mime_type", "size")

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj and obj.file:
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        return None

class SafeUserSerializer(serializers.ModelSerializer):
    """
    Serializer used to return user details to frontend.
    Adjust fields list to include whichever safe fields you want returned.
    """
    profile_pic = ProfilePicSerializer(read_only=True)
    
    class Meta:
        model = UserModel
        # include only safe fields—avoid exposing password fields, is_superuser, etc.
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "profile_pic",
            "phone",
            "university",
            "course",
            "year",
            "dob",
            "is_active",
        )
        read_only_fields = fields