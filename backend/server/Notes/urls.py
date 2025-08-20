from django.urls import path

from .views import NotesListAPIView, NotesDetailAPIView, NoteDownloadAPIView, SearchAPIView, ResourceRatingSummaryAPIView, ResourceRateAPIView

app_name = "Notes"

urlpatterns = [
    path("notes", NotesListAPIView.as_view(), name="notes-list"),
    path("notes/<uuid:id>", NotesDetailAPIView.as_view(), name="notes-detail"),
    path("notes/<uuid:id>/download", NoteDownloadAPIView.as_view(), name="notes-download"),
    path("search", SearchAPIView.as_view(), name="search"),
    
    path("notes/<uuid:id>/rating/", ResourceRatingSummaryAPIView.as_view(), name="note-rating-summary"),
    path("notes/<uuid:id>/rate/", ResourceRateAPIView.as_view(), name="note-rate"),
]
