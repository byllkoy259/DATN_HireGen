from google import genai
from app.core.config import settings

# Gemini Client
client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)
print(f"[Gemini] API key suffix: ...{settings.GEMINI_API_KEY[-4:]}")

# Local Embedding Model (Sentence-Transformers)
_embedding_model = None

def get_embedding_model():
    """Hàm này chỉ tải model vào RAM khi nào thực sự cần dùng đến."""
    global _embedding_model
    if _embedding_model is None:
        print("[AI] Đang tải mô hình SentenceTransformer vào RAM...")
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedding_model

def generate_embedding(text: str):
    """Sử dụng hàm này để gọi embedding thay vì gọi trực tiếp vào model."""
    model = get_embedding_model()
    return model.encode(text).tolist()

print("Đã khởi tạo xong cấu trúc các dịch vụ AI!")
