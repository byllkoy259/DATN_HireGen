FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --root-user-action=ignore --no-cache-dir -r requirements.txt

COPY . .

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"