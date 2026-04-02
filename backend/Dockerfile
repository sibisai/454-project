FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir --force-reinstall pip wheel "jaraco.context>=6.1.0" && \
    find /usr/local/lib -type d -name "jaraco.context-5.*" -exec rm -rf {} + 2>/dev/null; \
    find /usr/local/lib -type d -name "wheel-0.45.*" -exec rm -rf {} + 2>/dev/null; \
    true

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
