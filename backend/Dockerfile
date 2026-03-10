# Dockerfile — Backend FastAPI application
#
# Base image: Python 3.11 slim
# Installs requirements, copies application code,
# and runs the FastAPI app with uvicorn on port 8000.

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
