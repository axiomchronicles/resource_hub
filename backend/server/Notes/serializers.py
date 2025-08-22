# api/serializers.py
from rest_framework import serializers
from Resources.models import Resource, ResourceFile, ResourceRating
from typing import Optional

# --- existing imports / serializers above this line ---

class ResourceRateRequestSerializer(serializers.Serializer):
    value = serializers.IntegerField(min_value=1, max_value=5)

class ResourceRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceRating
        fields = ("value", "created_at", "updated_at")


# Update your existing ResourceSerializer to expose `user_rating`
class ResourceFileLiteSerializer(serializers.ModelSerializer):
    size_human = serializers.SerializerMethodField()
    class Meta:
        model = ResourceFile
        fields = ("id","file_id","name","size","size_human","mime_type","file_url","downloads_count")
    def get_size_human(self, obj):
        from .views import _human_bytes
        return _human_bytes(obj.size)
    
class ResourceFileSerializer(serializers.ModelSerializer):
    fileId = serializers.UUIDField(source="file_id", read_only=True)
    fileUrl = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()

    class Meta:
        model = ResourceFile
        fields = ("fileId", "name", "size", "mime_type", "fileUrl", "url", "created_at")

    def get_fileUrl(self, obj):
        if obj.file_url:
            return obj.file_url
        if obj.file:
            request = self.context.get("request")
            try:
                return request.build_absolute_uri(obj.file.url) if request else obj.file.url
            except Exception:
                return None
        return None

    def get_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        try:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        except Exception:
            return None

class ResourceSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    owner_profile_pic = serializers.SerializerMethodField()   # <-- NEW
    total_downloads = serializers.IntegerField(read_only=True)
    avg_rating = serializers.FloatField(read_only=True)
    rating_count = serializers.IntegerField(read_only=True)
    total_size_bytes = serializers.IntegerField(read_only=True)
    total_size_human = serializers.SerializerMethodField()
    file_count = serializers.IntegerField(read_only=True)
    first_file_name = serializers.CharField(read_only=True)
    first_file_mime = serializers.CharField(read_only=True)
    user_rating = serializers.IntegerField(read_only=True, allow_null=True)  # <- NEW
    pages = serializers.IntegerField(read_only = True)
    files = ResourceFileLiteSerializer(many=True, read_only=True)

    first_file_url = serializers.SerializerMethodField()
    first_mime_type = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = (
            "id","title","description","subject","semester","course_code","tags",
            "created_at","updated_at",
            "owner_name", "owner_profile_pic",  # <- NEW
            "total_downloads","avg_rating","rating_count",
            "total_size_bytes","total_size_human","file_count",
            "first_file_url","first_file_name","first_file_mime",
            "user_rating", "pages",               # <- NEW
            "files", "first_mime_type",
        )

    def get_owner_name(self, obj):
        u = getattr(obj, "owner", None)
        if not u:
            return "Unknown"
        return (getattr(u, "get_full_name", lambda: "")() or getattr(u, "username", "")) or "Unknown"
    
    def get_owner_profile_pic(self, obj):
        u = getattr(obj, "owner", None)
        if not u or not hasattr(u, "profile_pic"):
            return None
        pic = getattr(u, "profile_pic", None)
        if not pic or not pic.file:
            return None
        request = self.context.get("request")
        try:
            return request.build_absolute_uri(pic.file.url) if request else pic.file.url
        except Exception:
            return None

    def get_total_size_human(self, obj):
        from .views import _human_bytes
        return _human_bytes(getattr(obj, "total_size_bytes", None))
    
    def get_first_file_url(self, obj: Resource) -> Optional[str]:
        f = obj.files.first()
        if not f:
            return None
        ser = ResourceFileSerializer(f, context=self.context)
        return ser.data.get("fileUrl")

    def get_first_mime_type(self, obj: Resource) -> Optional[str]:
        f = obj.files.first()
        return f.mime_type if f else None


class SearchResultSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    type = serializers.CharField()
    subject = serializers.CharField(allow_blank=True, required=False)
    semester = serializers.CharField(allow_blank=True, required=False)
    course_code = serializers.CharField(allow_blank=True, required=False)
    tags = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    preview = serializers.CharField(allow_blank=True, required=False)
    description = serializers.CharField(allow_blank=True, required=False)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField(required=False)

    # Owner fields
    owner_name = serializers.CharField(allow_blank=True, required=False)
    owner_profile_pic = serializers.CharField(allow_blank=True, required=False)

    # Stats
    total_downloads = serializers.IntegerField(required=False)
    avg_rating = serializers.FloatField(required=False)
    rating_count = serializers.IntegerField(required=False)
    total_size_bytes = serializers.IntegerField(required=False)
    total_size_human = serializers.CharField(required=False)
    file_count = serializers.IntegerField(required=False)

    # File info
    first_file_url = serializers.CharField(allow_blank=True, required=False)
    first_file_name = serializers.CharField(allow_blank=True, required=False)
    first_file_mime = serializers.CharField(allow_blank=True, required=False)
    first_mime_type = serializers.CharField(allow_blank=True, required=False)

    # User-specific
    user_rating = serializers.IntegerField(required=False, allow_null=True)
    pages = serializers.IntegerField(required=False)

    # Related files
    files = ResourceFileLiteSerializer(many=True, required=False)
