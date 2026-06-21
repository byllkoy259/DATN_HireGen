import re
import uuid
import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

class StorageService:
    def upload_file(self, object_name: str, file_data: bytes, content_type: str) -> str:
        result = cloudinary.uploader.upload(
            file_data,
            public_id=object_name.replace("/", "_"),
            resource_type="auto"
        )
        return result["secure_url"]

    def build_unique_object_name(self, prefix: str, owner_id: str, filename: str | None) -> str:
        safe_filename = (filename or "upload").replace("\\", "/").split("/")[-1].strip()
        safe_filename = re.sub(r"[^A-Za-z0-9._-]+", "_", safe_filename).strip("._")
        if not safe_filename:
            safe_filename = "upload"
        safe_prefix = prefix.strip("/") or "uploads"
        return f"{safe_prefix}/{owner_id}/{uuid.uuid4().hex}_{safe_filename}"

    def get_file_data(self, object_name: str) -> bytes:
        import urllib.request
        with urllib.request.urlopen(object_name) as response:
            return response.read()

storage_service = StorageService()
# Alias để không phải sửa các file khác
minio_service = storage_service