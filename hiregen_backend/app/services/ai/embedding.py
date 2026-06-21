from typing import List
from app.services.ai.config import generate_embedding

def get_text_embedding(text: str) -> List[float]:
    """
    Băm (chunk) hoặc chuyển đổi một đoạn văn bản (kỹ năng/kinh nghiệm)
    thành vector số thực (384 chiều) bằng mô hình cục bộ.
    """
    # encode() trả về numpy array, chuyển sang list float để lưu DB
    vector = generate_embedding(text)
    return vector

def get_batch_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Nhúng nhiều đoạn văn bản cùng lúc để tối ưu tốc độ.
    """
    vectors = [generate_embedding(text) for text in texts]
    return vectors