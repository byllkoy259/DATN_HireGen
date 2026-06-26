# Hệ thống Hỗ trợ tuyển dụng và Đánh giá ứng viên ngành IT cho Thị trường Nhật Bản sử dụng AI

## 1. Giới thiệu

Đây là hệ thống phục vụ nền tảng tuyển dụng và đánh giá ứng viên sử dụng Trí tuệ Nhân tạo (HireGen). Dự án được thiết kế đặc biệt hướng tới việc tự động hóa quy trình tuyển dụng cho thị trường IT Nhật Bản. Hệ thống sử dụng kiến trúc Microservices và được đóng gói hoàn toàn bằng Docker.

**Chức năng chính:**
- **Quản lý Tuyển dụng:** Lưu trữ hồ sơ người dùng, nhà tuyển dụng và các job description.
- **AI Matching & RAG:** Tích hợp vector database để trích xuất, phân tích và matching CV của ứng viên với công việc phù hợp.
- **Quản lý File:** Lưu trữ CV và tài liệu của ứng viên tại hệ thống lưu trữ Object Storage.
- **Xử lý Tác vụ Nền:** Hỗ trợ hàng đợi (Task Queue) để chạy ngầm các tác vụ nặng của model AI.

## 2. Công nghệ sử dụng

- **Ngôn ngữ:** Python (FastAPI/Django)
- **Database (Quan hệ):** PostgreSQL 15 (Driver: `psycopg2-binary`, ORM: `SQLAlchemy`)
- **Database (Vector):** ChromaDB (lưu trữ embeddings phục vụ AI)
- **Message Broker & Task Queue:** Redis 7 & Celery
- **Object Storage:** MinIO (S3 Compatible)
- **Infrastructure:** Docker & Docker Compose

## 3. Cấu trúc Services (Quản lý Port)

Dự án được triển khai trên môi trường Docker với cấu hình mạng lưới (network) nội bộ `hiregen_network`. Dưới đây là danh sách các cổng (ports) đã được map ra máy host để truy cập:

| Service | Vai trò | Port Container | Port truy cập (Host) |
| :--- | :--- | :--- | :--- |
| **`postgres`** | CSDL Quan hệ (Lưu trữ User, Job, CV...) | `5432` | `5433` |
| **`chromadb`** | CSDL Vector phục vụ mô hình AI | `8000` | `8001` |
| **`redis`** | Quản lý cache và Message Queue | `6379` | `6379` |
| **`minio`** | Lưu trữ Object Storage (API) | `9000` | `9002` |
| **`minio-console`**| Giao diện Web quản trị MinIO | `9001` | `9003` |

---

## 4. Hướng dẫn cài đặt và chạy hệ thống

### Bước 1: Chuẩn bị môi trường
*   **Docker Desktop:** Đảm bảo Docker và Docker Compose đã được cài đặt và đang chạy trên thiết bị.
*   **Môi trường lập trình:** Thiết bị cần cài đặt sẵn Python (3.10+).

### Bước 2: Clone repository
Tải mã nguồn dự án về máy:
```bash
git clone https://github.com/byllkoy259/DATN_HireGen.git
cd DATN_HireGen
```

### Bước 3: Thiết lập và chạy Backend (FastAPI)
```bash
cd hiregen_backend

# Cấu hình biến môi trường
cp .env.example .env

# Khởi chạy các dịch vụ nền tảng (PostgreSQL, ChromaDB, Redis, MinIO)
docker compose up -d --build

# Khởi tạo và kích hoạt môi trường ảo (Windows)
python -m venv venv
.\venv\Scripts\activate

# Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt

# Khởi chạy Backend Server
uvicorn app.main:app --reload
```

### Bước 4: Khởi chạy Celery Worker (Xử lý tác vụ nền)
```bash
cd DATN_HireGen/hiregen_backend
.\venv\Scripts\activate
celery -A app.core.celery_app.celery_app worker --loglevel=info --pool=solo
```

### Bước 5: Thiết lập và chạy Frontend
```bash
cd DATN_HireGen/hiregen_frontend
npm install
npm run dev
```

---

## 5. Thông tin dự án
- **Dự án:** Đồ án Tốt nghiệp
- **Chương trình đào tạo:** HEDPI - Đại học Bách khoa Hà Nội (HUST)
