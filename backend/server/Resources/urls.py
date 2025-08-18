# resources/urls.py
from django.urls import path
from .views import (
    UploadSimpleAPIView,
    UploadInitiateAPIView,
    UploadChunkAPIView, 
    UploadCompleteAPIView,
    ResourceCreateAPIView,
)

app_name = "Resources"

urlpatterns = [
    path("simple/", UploadSimpleAPIView.as_view(), name="uploads-simple"),
    path("initiate/", UploadInitiateAPIView.as_view(), name="uploads-initiate"),
    path("<uuid:upload_id>/chunk/", UploadChunkAPIView.as_view(), name="uploads-chunk"),
    path("<uuid:upload_id>/complete/", UploadCompleteAPIView.as_view(), name="uploads-complete"),
    path("resources/", ResourceCreateAPIView.as_view(), name="resources-create"),
]
