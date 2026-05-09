FROM python:3.10-slim

WORKDIR /app

# curl: backend healthcheck.
# Node.js: lets agents run npx-based MCP servers (filesystem, github, etc.) out of the box.
# uv: lets agents run uvx-based MCP servers (mcp-server-fetch, etc.).
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir uv

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /app/data /app/data/chroma

COPY backend/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
