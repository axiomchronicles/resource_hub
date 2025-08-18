# resources/admin.py
from django.contrib import admin
from .models import Resource, ResourceFile, UploadSession

@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "owner", "subject", "semester", "created_at")
    search_fields = ("title", "owner__email", "subject", "course_code")
    list_filter = ("subject", "semester")

@admin.register(ResourceFile)
class ResourceFileAdmin(admin.ModelAdmin):
    list_display = ("id", "file_id", "owner", "name", "size", "mime_type", "created_at")
    search_fields = ("name", "owner__email", "file_id")
    list_filter = ("mime_type",)

@admin.register(UploadSession)
class UploadSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "filename", "status", "uploaded_chunks", "total_chunks", "created_at")
    search_fields = ("filename", "owner__email")
    list_filter = ("status",)
