from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field

class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int

    # JWT
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Admin
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str

    # Cloudinary (thay MinIO)
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    # GEMINI API
    GEMINI_API_KEY: str
    RUN_BASELINE_PIPELINE: bool

    # Redis
    REDIS_URL: str

    # ChromaDB
    CHROMA_HOST: str
    CHROMA_PORT: int

    # URL Database
    @computed_field
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Cấu hình để Pydantic đọc file .env
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Khởi tạo object settings để dùng chung cho toàn bộ project
settings = Settings()
