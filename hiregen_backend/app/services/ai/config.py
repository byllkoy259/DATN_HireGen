from google import genai
from app.core.config import settings

# Gemini Client
client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)
print(f"[Gemini] API key suffix: ...{settings.GEMINI_API_KEY[-4:]}")

def generate_embedding(text: str) -> list[float]:
    print("[AI] Đang gọi Gemini API để tạo vector embedding...")
    try:
        response = client.models.embed_content(
            model='gemini-embedding-001',
            contents=text,
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"[AI Error] Lỗi khi gọi Gemini Embedding: {e}")
        # Trả về vector rỗng 3072 chiều nếu lỗi để không làm sập app
        return [0.0] * 3072

print("Đã khởi tạo xong cấu trúc các dịch vụ AI!")