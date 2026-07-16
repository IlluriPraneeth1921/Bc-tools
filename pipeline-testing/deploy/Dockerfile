# pl-test: Pipeline Verification Tool
# Runs BOTH FastAPI (:8000) and Streamlit (:8501) in one container

FROM python:3.13-slim-bookworm

# Install base system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg2 \
    apt-transport-https \
    supervisor \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Microsoft ODBC Driver 18 for SQL Server
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list \
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

# Environment variables (defaults — override at runtime via ECS task definition)
ENV PYTHONPATH=/app
ENV ODBC_DRIVER="ODBC Driver 18 for SQL Server"
ENV PL_TEST_API_URL=http://localhost:8000
ENV DB_SERVER=localhost
ENV INTERFACE_DB_NAME=WiDHS.Qc.Interface.Carity.ToolTesting
ENV CARITY_DB_NAME=WiDHS.Qc.Carity.ToolTestig
ENV DB_USE_TRUSTED_CONNECTION=false

# Expose ports
EXPOSE 8000 8501

# Health check (API)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start both services via supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
