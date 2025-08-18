# resources/serializers.py
from rest_framework import serializers
from .models import Resource, ResourceFile, UploadSession 


class UploadInitiateSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=512)
    mimeType = serializers.CharField(max_length=128, required=False, allow_blank=True)
    size = serializers.IntegerField(min_value=1)
    chunkSize = serializers.IntegerField(min_value=1, required=False)

    def validate(self, data):
        # simple validation; deeper checks in services
        return data


class UploadChunkSerializer(serializers.Serializer):
    chunkIndex = serializers.IntegerField(min_value=0)
    totalChunks = serializers.IntegerField(min_value=1)
    chunk = serializers.FileField()


class ResourceFileUploadSerializer(serializers.ModelSerializer):
    fileId = serializers.UUIDField(source="file_id", read_only=True)
    fileUrl = serializers.SerializerMethodField()
    mimeType = serializers.CharField(source="mime_type", read_only=True)

    class Meta:
        model = ResourceFile
        fields = ("fileId", "fileUrl", "name", "size", "mimeType", "sha256")

    def get_fileUrl(self, obj):
        if obj.file:
            try:
                return obj.file.url
            except Exception:
                return None
        return obj.file_url


class ResourceFileInputSerializer(serializers.Serializer):
    fileId = serializers.UUIDField(required=False)
    fileUrl = serializers.CharField(required=False, allow_blank=True)
    name = serializers.CharField(required=False, allow_blank=True)
    size = serializers.IntegerField(required=False)
    mimeType = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("fileId") and not attrs.get("fileUrl"):
            raise serializers.ValidationError("Provide fileId or fileUrl.")
        return attrs


class ResourceCreateSerializer(serializers.ModelSerializer):
    files = ResourceFileInputSerializer(many=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = Resource
        fields = ("title", "description", "subject", "semester", "course_code", "tags", "files")

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        files_data = validated_data.pop("files", [])
        resource = Resource.objects.create(owner=user, **validated_data)

        # Attach files
        for entry in files_data:
            if entry.get("fileId"):
                rf = ResourceFile.objects.filter(file_id=entry["fileId"], owner=user).first()
                if not rf:
                    raise serializers.ValidationError({"files": f"fileId {entry['fileId']} not found or not owned by user."})
                if rf.resource_id != resource.id:
                    rf.resource = resource
                    rf.save(update_fields=["resource"])
            else:
                ResourceFile.objects.create(
                    resource=resource,
                    owner=user,
                    file_url=entry.get("fileUrl"),
                    name=entry.get("name") or (entry.get("fileUrl") or "")[:200],
                    size=entry.get("size"),
                    mime_type=entry.get("mimeType"),
                )

        return resource


class ResourceSerializer(serializers.ModelSerializer):
    files = ResourceFileUploadSerializer(many=True, read_only=True)
    owner = serializers.StringRelatedField()

    class Meta:
        model = Resource
        fields = ("id", "owner", "title", "description", "subject", "semester", "course_code", "tags", "created_at", "files")
