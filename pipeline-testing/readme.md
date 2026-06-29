# pl-test — Data Pipeline Verification Tool

A FastAPI application that verifies the correctness of the WI DHS data pipeline by comparing expected state against actual database state across all 4 processing stages.

## Quick Start

### Option 1: Local Development (no Docker)

```bash
# Activate the virtual environment
.venv\Scripts\activate

# Start the FastAPI backend (Terminal 1)
cd pl-test
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Start the Streamlit UI (Terminal 2)
cd pl-test
streamlit run src/web/app.py

# Open in browser:
#   Streamlit UI: http://localhost:8501
#   FastAPI Swagger: http://localhost:8000/docs
```

### Option 2: Docker (recommended)

```bash
# Build the container (ARM64 image)
docker build --platform linux/arm64 -t pl-test:latest -f deploy/Dockerfile .

# Run with environment variables
docker run -d --name pl-test \
  -p 8000:8000 -p 8501:8501 \
  -e DB_USE_TRUSTED_CONNECTION=false \
  -e DB_SERVER=mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com \
  -e DB_USERNAME=your_sql_user \
  -e DB_PASSWORD=your_sql_pass \
  -e PL_TEST_USERNAME=admin \
  -e PL_TEST_PASSWORD=yourpassword \
  pl-test:latest

# Or use docker-compose (create deploy/.env first from deploy/.env.example)
docker-compose -f deploy/docker-compose.yml up --build
```

### Option 3: AWS Deployment (ECS Fargate + Graviton)

```bash
cd deploy/cdk
npm install
npx cdk synth     # Review the CloudFormation template
npx cdk deploy    # Deploy to AWS
```

See `deploy/cdk/README.md` for full CDK deployment instructions.

## Run Tests

### Python Unit/Integration Tests (pytest)

```bash
.venv\Scripts\activate
cd pl-test
python -m pytest
```

**Current status: 111 tests passing.**

### Playwright E2E Tests (ATCs, UJTs, API)

The `tests/` directory contains a comprehensive Playwright test suite following the [Carity Test Automation Strategy](docs/test-strategy.md). It includes:
- **62 ATCs** (Atomic Test Cases) — Single-behavior UI validation
- **11 UJTs** (User Journey Tests) — End-to-end workflow verification
- **48 API Tests** — Direct REST endpoint testing

```powershell
# Setup (one time)
cd tests
npm install
npx playwright install --with-deps chromium

# Run all mock-mode tests (no backend required)
npx playwright test --config=playwright.config.ts

# Run by test type
npx playwright test --config=playwright.config.ts --project=atc-mock     # ATCs only
npx playwright test --config=playwright.config.ts --project=ujt-mock     # UJTs only

# Run live-mode tests (requires running backend)
$env:LIVE_MODE="true"; npx playwright test --config=playwright.config.ts --project=api

# Run by plan tag
npx playwright test --config=playwright.config.ts --grep "@smoke"
npx playwright test --config=playwright.config.ts --grep "@regression"

# Generate coverage report
node scripts/coverage-report.js

# View HTML report
npx playwright show-report reports/html
```

See [`tests/README.md`](tests/README.md) for full documentation.

---

## Project Structure

```
WIDHS Testing/
├── .venv/                         # Python virtual environment
├── data/                          # Test data files organized by interface type
│   ├── icd_d06/                   # ICD-D06 Medicaid Provider File test data (.psv)
│   └── icd_d12/                   # ICD-D12 FSIA Functional Screen test data (.txt)
├── doc/                           # Design documents, specifications, task lists
│   ├── design.md                  # System design (4-stage pipeline, architecture)
│   ├── specs/                     # Interface specification documents (PDF, Excel)
│   ├── requirements.md
│   ├── TASK_LIST.md
│   └── ...
├── tests/                         # Playwright E2E test suite (NEW)
│   ├── playwright.config.ts       # Multi-project test configuration
│   ├── atc/                       # Atomic Test Cases (62 tests, 6 modules)
│   ├── ujt/                       # User Journey Tests (11 tests, 4 journeys)
│   ├── api/                       # Direct REST API tests (48 tests, 5 modules)
│   ├── fixtures/                  # Shared fixtures, mocks, selectors
│   ├── scripts/                   # Coverage report generators
│   └── reports/                   # Generated test reports
├── pl-test/                       # Application source code
│   ├── src/                       # ALL application code
│   │   ├── main.py               # FastAPI entry point (uvicorn src.main:app)
│   │   ├── api/                   # REST API endpoints
│   │   │   ├── test_runs.py      # POST/GET /api/test-runs/
│   │   │   ├── files.py          # POST /api/files/upload, /api/files/parse-local
│   │   │   ├── compare.py        # POST /api/compare/run, GET /api/compare/mismatches/{id}
│   │   │   └── cleanup.py        # POST/DELETE /api/cleanup/{id}, /api/cleanup/pipeline/*
│   │   ├── core/                  # Configuration, DB, and shared models
│   │   │   ├── config.py         # pydantic-settings (env-based)
│   │   │   ├── database.py       # pyodbc connection manager
│   │   │   ├── models.py         # MismatchRecord, ComparatorResult (generic)
│   │   │   └── test_run.py       # TestRun model
│   │   ├── interfaces/           # Plugin system (multi-file-type support)
│   │   │   ├── __init__.py       # Registry: register(), get_interface(), list_interfaces()
│   │   │   ├── base.py           # Abstract classes: InterfacePlugin, BaseParser, etc.
│   │   │   ├── icd_d06/          # ICD-D06: Medicaid Provider File (.psv)
│   │   │   │   ├── plugin.py     # Plugin metadata + factory methods
│   │   │   │   ├── models.py     # 15 record type dataclasses
│   │   │   │   ├── parser.py     # Pipe-delimited parser
│   │   │   │   ├── expected_state.py  # Stage 1-4 expected state generators
│   │   │   │   ├── stage3_generator.py  # Business rules + vocab lookups
│   │   │   │   ├── comparator.py # DB comparison logic
│   │   │   │   └── vocab_config.py  # ICD-D06 vocabulary lookup keys
│   │   │   └── icd_d12/          # ICD-D12: FSIA Functional Screen File (.txt)
│   │   │       ├── plugin.py     # Plugin metadata + factory methods
│   │   │       ├── models.py     # HDR + DTL record dataclasses (69 fields)
│   │   │       ├── parser.py     # Fixed-width space-delimited parser
│   │   │       ├── expected_state.py  # Stage 1-4 + business rule evaluations
│   │   │       ├── comparator.py # DB comparison logic
│   │   │       └── vocab_config.py  # ICD-D12 vocabulary lookup keys
│   │   ├── web/                   # Streamlit UI (calls FastAPI via HTTP)
│   │   │   ├── app.py            # Main entry point (streamlit run src/web/app.py)
│   │   │   ├── api_client.py     # HTTP client for FastAPI backend
│   │   │   ├── auth.py           # Basic password authentication
│   │   │   └── pages/            # Multi-page Streamlit screens
│   │   │       ├── 1_Load_File.py
│   │   │       ├── 2_Compare.py
│   │   │       ├── 3_Mismatches.py
│   │   │       ├── 4_Cleanup.py
│   │   │       └── 5_Test_Runs.py
│   │   ├── services/             # Shared services
│   │   │   └── vocab_client.py   # Generic vocabulary lookup (keys passed by plugin)
│   │   ├── parsers/              # Backward-compatible shims (re-export from icd_d06)
│   │   ├── models/               # Backward-compatible shims (re-export from icd_d06)
│   │   └── clients/              # External clients (S3, DB)
│   ├── tests/                     # Integration & API tests
│   │   └── api/
│   │       └── test_api.py       # FastAPI endpoint tests
│   ├── database/                  # SQL DDL scripts
│   ├── requirements.txt
│   └── pytest.ini
├── deploy/                        # Containerization & AWS deployment
│   ├── Dockerfile                 # ARM64 image (FastAPI + Streamlit + ODBC)
│   ├── docker-compose.yml         # Local development
│   ├── supervisord.conf           # Runs both services in one container
│   ├── streamlit-config.toml      # Streamlit server settings
│   ├── .env.example               # Template for docker-compose env vars
│   ├── .dockerignore
│   └── cdk/                       # AWS CDK (TypeScript)
│       ├── lib/pl-test-stack.ts   # ECS Fargate + ALB + Secrets Manager
│       ├── bin/app.ts             # CDK app entry point
│       ├── package.json
│       └── README.md              # CDK deployment guide
└── readme.md                      # This file
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| POST | `/api/test-runs/` | Create a test run |
| GET | `/api/test-runs/` | List recent test runs |
| GET | `/api/test-runs/{id}` | Get test run details |
| POST | `/api/files/upload` | Upload and parse a .psv file |
| POST | `/api/files/parse-local` | Parse a file from a local path |
| GET | `/api/files/cached` | List files currently in memory |
| **POST** | **`/api/compare/run`** | **Run full comparison pipeline** |
| GET | `/api/compare/mismatches/{id}` | Get mismatch details (filterable) |
| GET | `/api/compare/summary/{id}` | Get aggregated summary by stage |
| POST | `/api/cleanup/{id}` | Cleanup verification data for a run |
| DELETE | `/api/cleanup/{id}` | Permanently delete a test run |

### Main Endpoint: `/api/compare/run`

This orchestrates the full test lifecycle:

```json
POST /api/compare/run
{
  "filepath": "c:/path/to/WI_PROV_FILE_EXTRACT_T.psv",
  "interface_type": "icd_d06",
  "mcd_id_prefix": "000000000",
  "stages": [1, 2, 3, 4]
}
```

Response:
```json
{
  "test_run_id": "uuid",
  "filename": "WI_PROV_FILE_EXTRACT_T.psv",
  "status": "PASS|FAIL|PARTIAL",
  "total_providers": 3,
  "total_source_lines": 50,
  "stages": [
    {"stage": 1, "total_checks": 150, "pass_count": 150, "fail_count": 0, "missing_count": 0},
    {"stage": 2, "total_checks": 324, "pass_count": 320, "fail_count": 4, "missing_count": 0},
    ...
  ],
  "total_checks": 600,
  "total_pass": 595,
  "total_fail": 5,
  "total_missing": 0
}
```

---

## Supported Interfaces (Plugin Architecture)

The tool uses a plugin architecture to support multiple file types. Each interface implements its own parser, expected state generator, and comparator.

| Interface | File Type | Format | Entity ID | Description |
|-----------|-----------|--------|-----------|-------------|
| **ICD-D06** | `.psv` | Pipe-delimited | Medicaid Provider Number | Medicaid Provider File (15 record types, demographics, contracts, NPIs, waivers) |
| **ICD-D12** | `.txt` | Fixed-width space-delimited | Medicaid ID (MCI) | FSIA Adult Functional Screen (ADLs, IADLs, health services, behaviors, eligibility) |

### Adding a New Interface

1. Create `src/interfaces/icd_dXX/` with: `plugin.py`, `models.py`, `parser.py`, `expected_state.py`, `comparator.py`, `vocab_config.py`
2. Add one import line to `src/interfaces/__init__.py`
3. Add test data files to `data/icd_dXX/`
4. The UI, API, test run management, and mismatch storage work automatically.

---

## 4-Stage Pipeline Under Test

```
Source File (.psv)
    ↓ Job Engine
Stage 1: [CustomerInterfaceModule].[MedicaidProviderRaw]        — Raw lines (1:1)
    ↓ Stored Procedures
Stage 2: [CustomerInterfaceModule].[MedicaidProviderMain/...]   — Parsed (14 tables)
    ↓ Stored Procedures + Vocabulary Lookups
Stage 3: [InterfaceModule].[IncomingOrganization/...]           — Transformed (26 tables)
    ↓ Stored Procedures (straight copy)
Stage 4: [OrganizationModule].[Organization/Location/...]       — Final Carity DB (30 tables)
```

**Database Server:** `mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com`
- Interface DB (Stages 1-3): `WiDHS.Qc.Interface.Carity.ToolTesting`
- Carity DB (Stage 4): `WiDHS.Qc.Carity.ToolTestig`

---

## Database Setup (One-Time)

Before first use, run the DDL scripts to create the `[TestVerification]` schema:

```bash
# Execute scripts in order on WiDHS.Qc.Interface.Carity.ToolTesting
sqlcmd -S <server> -d "WiDHS.Qc.Interface.Carity.ToolTesting" -i database/001_create_schema.sql
sqlcmd -S <server> -d "WiDHS.Qc.Interface.Carity.ToolTesting" -i database/002_create_test_run.sql
sqlcmd -S <server> -d "WiDHS.Qc.Interface.Carity.ToolTesting" -i database/003_create_mismatch_report.sql
sqlcmd -S <server> -d "WiDHS.Qc.Interface.Carity.ToolTesting" -i database/004_create_expected_state_stage1.sql
sqlcmd -S <server> -d "WiDHS.Qc.Interface.Carity.ToolTesting" -i database/005_create_expected_state_stage2.sql
sqlcmd -S <server> -d "WiDHS.Qc.Interface.Carity.ToolTesting" -i database/006_create_expected_state_stage3.sql
sqlcmd -S <server> -d "WiDHS.Qc.Interface.Carity.ToolTesting" -i database/007_create_expected_state_stage4.sql
```

Note: Pipeline and Carity data cleanup is handled by the Python plugin system (no stored procedures needed). Each interface plugin provides its own `pipeline_cleanup_config` and `carity_cleanup_config` metadata.

Or run them via SSMS in the same order. See `pl-test/database/README.md` for details.

---

## Business Rules Verified

| Rule | What's Checked |
|------|---------------|
| BR-D06-005 | PHW Providers (Type=90, Specialty=85x) NOT loaded |
| BR-D06-012 | Billing Indicator "R" → provider skipped |
| BR-D06-018 | Address Type "S" marked as Current |
| BR-D06-019 | ZIP code formatted as 5-digit or 5-dash-4 |
| BR-D06-020 | Status "Active" only when WVR contract + IRIS program both active |
| BR-D06-022 | Multiple NPIs → only most recent loaded |
| BR-D06-023 | Multiple TINs → only most recent per type loaded |

---

## Data Isolation

Test data uses reserved MCD ID prefix `000000000xxxxx` to prevent collision with production or other testers' data. All database queries filter by this prefix.

---

## Vocabulary Lookups

The system reads vocabulary directly from `[InterfaceModule].[VocabularyLookupDisplayNames]` — the same source of truth the pipeline stored procedures use. No separate JSON stub files needed.

---

## What's Next

- [x] Plugin architecture implemented (supports multiple file types)
- [x] ICD-D06 Medicaid Provider File — fully implemented
- [x] ICD-D12 FSIA Functional Screen File — fully implemented
- [x] Deploy to AWS via CDK (`deploy/cdk/`)
- [ ] Run first live comparison against actual pipeline-processed data
- [ ] Add remaining 18+ interfaces as plugins

See `doc/design.md` for full architecture and `doc/TASK_LIST.md` for detailed task breakdown.

---

## Deployment Options

### Local (Docker)

```bash
# 1. Copy and fill environment variables
cp deploy/.env.example deploy/.env
# Edit deploy/.env with your SQL credentials

# 2. Build and run
docker-compose -f deploy/docker-compose.yml up --build

# 3. Access
#    Web UI: http://localhost:8501 (login with PL_TEST_USERNAME/PASSWORD)
#    API: http://localhost:8000/docs (Swagger)
```

### AWS (ECS Fargate on Graviton ARM64)

```bash
# 1. Install CDK
npm install -g aws-cdk

# 2. Setup
cd deploy/cdk
npm install

# 3. Enable ARM64 emulation (required before first build, and after Docker Desktop restart)
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

# 4. Review what will be created
npx cdk synth
npx cdk diff

# 5. Deploy
npx cdk deploy

# 6. After deploy: update Secrets Manager with real DB credentials
# Go to AWS Console → Secrets Manager → pl-test/db-credentials
# Update username/password with actual SQL Server credentials

# 7. Retrieve generated login credentials
aws secretsmanager get-secret-value --secret-id pl-test/app-credentials --query "SecretString" --output text

# 8. Access via ALB URL (output from cdk deploy)
```

#### Deployment Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `exec format error` during Docker build | QEMU binfmt not registered | Run `docker run --rm --privileged multiarch/qemu-user-static --reset -p yes` |
| `cdk synth` hangs / very slow | Large build context being hashed | Ensure `.dockerignore` exists at project root excluding `.venv/`, `node_modules/`, etc. |
| Deployment stuck, tasks cycling | Container failing health checks | Check logs: `aws logs get-log-events --log-group-name /ecs/pl-test ...` |
| Stack in `CREATE_IN_PROGRESS` can't update | Previous deploy still running | Delete the stuck stack: `aws cloudformation delete-stack --stack-name PlTestStack` |
| Login fails with Dockerfile default password | ECS injects password from Secrets Manager | Retrieve with: `aws secretsmanager get-secret-value --secret-id pl-test/app-credentials` |
| `ecs.Platform` TypeScript error | Wrong CDK module | Use `ecr_assets.Platform.LINUX_ARM64` from `aws-cdk-lib/aws-ecr-assets` |

#### CDK Stack Details

- **VPC:** Uses existing `vpc-08528a0502a0f3891` (LowerWlInfrastructure01) with private subnets
- **ALB:** Internal (no public subnets available), ports 80 (Streamlit) and 8000 (FastAPI)
- **Health checks:** Both target groups check `/health` on port 8000 (FastAPI)
- **Circuit breaker:** Enabled — failed deployments roll back automatically in ~5 min
- **Secrets:** Auto-generated in Secrets Manager (`pl-test/db-credentials`, `pl-test/app-credentials`)

**Estimated AWS cost:** ~$34/month (Fargate ARM64 + ALB + Secrets Manager)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_SERVER` | SQL Server hostname | RDS endpoint |
| `DB_USERNAME` | SQL auth username | (required for container) |
| `DB_PASSWORD` | SQL auth password | (required for container) |
| `INTERFACE_DB_NAME` | Interface database name | `WiDHS.Qc.Interface.Carity.ToolTesting` |
| `CARITY_DB_NAME` | Carity database name | `WiDHS.Qc.Carity.ToolTestig` |
| `DB_USE_TRUSTED_CONNECTION` | Use Windows auth | `false` (must be false in container) |
| `MCD_ID_PREFIX` | Test data isolation prefix | `000000000` |
| `PL_TEST_USERNAME` | Web UI login username | `admin` |
| `PL_TEST_PASSWORD` | Web UI login password | `pltest2026` |
| `PL_TEST_API_URL` | FastAPI backend URL | `http://localhost:8000` |

### Container Ports

| Port | Service | Purpose |
|------|---------|---------|
| 8000 | FastAPI | REST API + Swagger docs |
| 8501 | Streamlit | Web UI for QA staff |
