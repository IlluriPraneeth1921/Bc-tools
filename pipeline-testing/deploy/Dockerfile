# pl-test: Pipeline Verification Tool
# ARM64 image for Graviton-based ECS Fargate
# Runs BOTH FastAPI (:8000) and Streamlit (:8501) in one container

FROM --platform=linux/arm64 python:3.13-slim-bookworm

# Install system dependencies + Microsoft ODBC Driver 18 for SQL Server (ARM64)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg2 \
    apt-transport-https \
    supervisor \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 unixodbc-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY pl-test/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY pl-test/src/ ./src/
COPY pl-test/tools/ ./tools/
COPY pl-test/database/ ./database/

# Supervisor config to run both services
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Streamlit config (disable telemetry, set ports)
COPY deploy/streamlit-config.toml /root/.streamlit/config.toml

# Environment variables (defaults — override at runtime)
ENV PYTHONPATH=/app
ENV PL_TEST_API_URL=http://localhost:8000
ENV PL_TEST_USERNAME=admin
ENV PL_TEST_PASSWORD=pltest2026
ENV DB_SERVER=localhost
ENV INTERFACE_DB_NAME=WiDHS.Qc.Interface.Carity.ToolTesting
ENV CARITY_DB_NAME=WiDHS.Qc.Carity.ToolTestig
ENV DB_USE_TRUSTED_CONNECTION=false
ENV DB_USERNAME=""
ENV DB_PASSWORD=""

# Expose ports
EXPOSE 8000 8501

# Health check (API)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start both services via supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
