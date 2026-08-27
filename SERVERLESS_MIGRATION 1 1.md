# Serverless Test Execution — Complete Strategy

A comprehensive guide covering **what** to build, **why** it's better, **how** to build it,
and the **cost** — for all test types: UI, API, Performance (JMeter), and 508/Accessibility.

---

## Executive Summary

| | Current (ADO Agents) | Proposed (ECS Fargate) |
|---|---|---|
| Monthly cost | $600–2,700 | ~$15–55 |
| Idle waste | 90%+ compute unused | Zero |
| Parallel modules | Limited by agent count (6-9) | Unlimited (54+ simultaneous) |
| Cold start | 3-5 min (npm ci + browser install) | 30 seconds |
| Security | Secrets on agent machines | Secrets Manager (encrypted, rotated) |
| Isolation | Shared agent, cross-contamination risk | Fresh container per run |
| VPC access to Carity | Via VPN on agent | Direct (same subnets) |

**Decision:** Move all test execution to AWS ECS Fargate. ADO remains the trigger/UI — 
the team experience stays the same (same buttons, same parameters, same reports in ADO).

---

## What We're Building

### One Platform, Four Test Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Carity Test Execution Platform                            │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐   │
│  │ UI Tests │  │ API Tests│  │  JMeter  │  │  508 / Accessibility     │   │
│  │ (Browser)│  │ (HTTP+DB)│  │  (Perf)  │  │  (axe-core + WCAG)      │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────────┬─────────────┘   │
│       │              │              │                      │                 │
│       ▼              ▼              ▼                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              Shared ECS Fargate Cluster                              │    │
│  │                                                                      │    │
│  │  • Private subnets (same VPC as Carity)                             │    │
│  │  • Per-suite Docker images in ECR                                    │    │
│  │  • Secrets from AWS Secrets Manager                                  │    │
│  │  • Reports to S3 → CloudFront                                       │    │
│  │  • Logs to CloudWatch                                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              Shared Infrastructure                                   │    │
│  │                                                                      │    │
│  │  S3 Bucket (reports + code bundles)                                  │    │
│  │  CloudFront (serve HTML reports)                                     │    │
│  │  CloudWatch (logs + metrics + alarms)                                │    │
│  │  Trigger Lambda (API to start any suite)                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why It's Better — Side-by-Side Comparison

### Problem 1: Cost

```
CURRENT:
  6 self-hosted agents × $100-300/mo = $600-1800/mo (running 24/7, idle 90%)
  + Microsoft-hosted for API tests = ~$50-100/mo
  Total: $650-1900+/month

SERVERLESS:
  Pay only when tests run
  54-module regression (8 min) = $0.70 per run
  Smoke (15 min) = $0.025 per run
  API E2E (10 min × 4 shards) = $0.033 per run
  Total: ~$15-55/month (based on your actual usage)
```

### Problem 2: Speed

```
CURRENT:
  npm ci = 2 min
  playwright install = 1 min
  Regression with 6 agents = batched, waiting for agents = 30+ min wall clock
  Total cold-to-first-test: 3-5 min

SERVERLESS:
  Image pull = 15s
  Code bundle extract = 3s
  All 54 modules launch simultaneously = 8 min wall clock
  Total cold-to-first-test: 30 seconds
```

### Problem 3: Agent Contention

```
CURRENT:
  54 modules, 6 agents → 9 batches × wait for each to finish
  One slow module blocks the next batch
  Agent crashes = whole batch fails

SERVERLESS:
  54 modules = 54 simultaneous Fargate tasks
  No waiting, no batching, no contention
  One module failure doesn't affect others
```

### Problem 4: Security

```
CURRENT:
  Credentials stored in agent env vars / .env files
  Agents accessible on corporate network
  No rotation, no audit trail
  Shared agent = secrets visible to all pipelines

SERVERLESS:
  Secrets Manager: encrypted, auto-rotated, IAM-scoped
  Container is ephemeral: destroyed after each run
  No persistent credentials anywhere
  Audit trail via CloudTrail
```

---

## The Four Test Types — How Each Runs Serverless

### 1. UI Tests (Playwright + Browser)

**What:** Smoke (27 UJTs), Regression (54 modules), SMS Consent, MFA, Location, etc.
**Needs:** Chromium browser, Node.js, test framework, VPC access to Carity web app.

| Aspect | Details |
|--------|---------|
| Docker image | `carity-browser-runner` (~1.5 GB) |
| Base | `mcr.microsoft.com/playwright:v1.52.0-noble` |
| Contains | Node 22 + npm packages + Chromium + test code |
| Fargate config | 2 vCPU / 4 GB / 50 GB ephemeral |
| VPC access | Lambda Proxy for browser → Carity web app |
| Run time | 5-15 min (smoke) / 8 min per module (regression) |

```dockerfile
# Dockerfile.browser (UI tests)
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM mcr.microsoft.com/playwright:v1.52.0-noble
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json playwright.config.ts ./
COPY src/ ./src/
COPY tests/ ./tests/
COPY fixtures/ ./fixtures/
COPY profiles/ ./profiles/
COPY data/ ./data/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV CI=true HEADLESS=true NODE_OPTIONS="--max-old-space-size=4096"
ENTRYPOINT ["/entrypoint.sh"]
```

---

### 2. API E2E Tests (HTTP + SQL Verification)

**What:** 170 Excel-driven API tests — POST → GET → SQL verify.
**Needs:** Node.js, mssql driver, network access to API + RDS. NO browser.

| Aspect | Details |
|--------|---------|
| Docker image | `carity-api-runner` (~200 MB) — much smaller, no browser |
| Base | `node:22-bookworm-slim` |
| Contains | Node 22 + mssql + xlsx + exceljs + test code |
| Fargate config | 1 vCPU / 2 GB (lighter — API only) |
| VPC access | Direct to RDS (SQL Server) + API endpoints |
| Run time | 10-15 min with 4 shards |
| Sharding | Native Playwright `--shard=N/M` across parallel tasks |

```dockerfile
# Dockerfile.api (API E2E tests — no browser)
FROM node:22-bookworm-slim
WORKDIR /app

# System deps for native SQL driver
RUN apt-get update && apt-get install -y \
    unixodbc-dev python3 make g++ curl \
    && rm -rf /var/lib/apt/lists/*

COPY api-e2e-testing/package.json api-e2e-testing/package-lock.json ./
RUN npm ci

COPY api-e2e-testing/ ./
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV CI=true NODE_OPTIONS="--max-old-space-size=2048"
ENTRYPOINT ["/entrypoint.sh"]
```

**Why a separate image?** Browser binaries (Chromium) add ~800 MB. API tests don't need them.
Smaller image = faster pull = faster start = less cost per run.

---

### 3. Performance Tests (JMeter)

**What:** Load/stress testing of Carity APIs — concurrent users, response times, throughput.
**Needs:** JMeter runtime, Java, network access to API endpoints.

| Aspect | Details |
|--------|---------|
| Docker image | `carity-jmeter-runner` (~500 MB) |
| Base | `eclipse-temurin:21-jre-jammy` (Java 21 runtime) |
| Contains | Apache JMeter 5.6 + plugins + JMX scripts + CSV data |
| Fargate config | 4 vCPU / 8 GB (load generation needs more resources) |
| VPC access | Direct to API endpoints (same VPC) |
| Run time | 10-30 min depending on test profile |
| Scaling | Multiple tasks = distributed load generation |

```dockerfile
# Dockerfile.jmeter (Performance tests)
FROM eclipse-temurin:21-jre-jammy

# Install JMeter
ENV JMETER_VERSION=5.6.3
ENV JMETER_HOME=/opt/apache-jmeter-${JMETER_VERSION}
ENV PATH=$JMETER_HOME/bin:$PATH

RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz | \
    tar -xz -C /opt && \
    rm -rf /var/lib/apt/lists/*

# JMeter plugins (if needed)
# COPY plugins/ $JMETER_HOME/lib/ext/

WORKDIR /app
COPY jmeter/ ./jmeter/
COPY entrypoint-jmeter.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

**JMeter Entrypoint:**
```bash
#!/bin/bash
set -e
SCRIPT=${TEST_SCRIPT:-"jmeter/smoke-load.jmx"}
THREADS=${THREADS:-10}
DURATION=${DURATION:-300}
REPORT_DIR=${REPORT_DIR:-"jmeter-report"}

echo "Running JMeter: $SCRIPT (threads=$THREADS, duration=${DURATION}s)"

jmeter -n -t "$SCRIPT" \
  -Jthreads=$THREADS \
  -Jduration=$DURATION \
  -Jhost=${API_HOST} \
  -l results.jtl \
  -e -o "$REPORT_DIR"

# Upload to S3
TASK_ID=$(curl -s "$ECS_CONTAINER_METADATA_URI_V4/task" | python3 -c "import sys,json; print(json.load(sys.stdin)['TaskARN'].split('/')[-1])")
aws s3 cp "$REPORT_DIR/" "s3://${S3_REPORT_BUCKET}/runs/${TASK_ID}/" --recursive
aws s3 cp results.jtl "s3://${S3_REPORT_BUCKET}/runs/${TASK_ID}/results.jtl"
```

**Distributed Load Testing (Heavy Load):**
For 100+ concurrent users, run multiple Fargate tasks as JMeter "slaves":

```
Task 1 (controller): jmeter -n -t script.jmx -R task2,task3,task4
Task 2 (worker):     jmeter-server
Task 3 (worker):     jmeter-server
Task 4 (worker):     jmeter-server
```

Each task generates load from a different container — simulates geographically distributed users.
4 tasks × 4 vCPU = 16 vCPU of load generation capacity, spun up in 30 seconds, destroyed after.

---

### 4. Section 508 / WCAG Accessibility Tests

**What:** Automated WCAG 2.1 AA compliance checks using axe-core + Playwright.
**Needs:** Same as UI tests (browser-based), but runs axe-core scans instead of functional flows.

| Aspect | Details |
|--------|---------|
| Docker image | Same `carity-browser-runner` (reuses UI test image) |
| Playwright project | `smoke-a11y`, `smoke-a11y-firefox`, etc. (8 viewport/browser combos) |
| Output | VPAT 508 report + WCAG violation HTML + JUnit |
| Fargate config | 2 vCPU / 4 GB (same as UI) |
| Run time | 20-30 min (scans all pages across viewports/browsers) |
| Parallelism | Each browser/viewport combo = separate task |

**No separate Docker image needed.** 508 tests use the same browser runner image.
The difference is just the Playwright project and reporters:

```bash
# Run all a11y projects in parallel (8 tasks)
npx playwright test --project=smoke-a11y                    # Chrome 1920x1080
npx playwright test --project=smoke-a11y-firefox            # Firefox 1920x1080
npx playwright test --project=smoke-a11y-webkit             # Safari 1920x1080
npx playwright test --project=smoke-a11y-tablet             # iPad Pro
npx playwright test --project=smoke-a11y-mobile-iphone      # iPhone 14
npx playwright test --project=smoke-a11y-mobile-android     # Pixel 7
npx playwright test --project=smoke-a11y-1366x768           # Laptop
npx playwright test --project=smoke-a11y-2560x1440          # QHD monitor
```

In serverless mode, launch **8 parallel Fargate tasks** — one per project.
All 8 run simultaneously, finish in ~20 min instead of 160 min sequentially.

**Reports produced:**
- `wcag-a11y-reporter.ts` → WCAG violation report (HTML)
- `WCAG-bug-html-reporter.ts` → Layout/responsive defect report
- `vpat-508-reporter.ts` → Full VPAT 2.4 Rev conformance document
- JUnit XML → ADO Test Results tab

---

## How to Build It — Step by Step

### Infrastructure (Build Once, Use Forever)

```
Step 1: Create ECR repositories (3 images)
  aws ecr create-repository --repository-name carity-browser-runner
  aws ecr create-repository --repository-name carity-api-runner
  aws ecr create-repository --repository-name carity-jmeter-runner

Step 2: Build and push Docker images
  docker build -f Dockerfile.browser -t carity-browser-runner .
  docker build -f Dockerfile.api -t carity-api-runner .
  docker build -f Dockerfile.jmeter -t carity-jmeter-runner .
  # Tag and push to ECR...

Step 3: Create ECS cluster
  aws ecs create-cluster --cluster-name carity-test-execution

Step 4: Create S3 bucket for reports
  aws s3 mb s3://carity-test-reports
  # Add lifecycle rule: delete objects after 90 days

Step 5: Create CloudWatch log group
  aws logs create-log-group --log-group-name /ecs/carity-tests
  aws logs put-retention-policy --log-group-name /ecs/carity-tests --retention-in-days 30

Step 6: Create Secrets Manager secret
  aws secretsmanager create-secret --name carity-tests/env-config \
    --secret-string '{"STD_F1_USER":"...", "STD_F1_PASS":"...", ...}'

Step 7: Create task definitions (one per image type)
  aws ecs register-task-definition --cli-input-json file://task-def-browser.json
  aws ecs register-task-definition --cli-input-json file://task-def-api.json
  aws ecs register-task-definition --cli-input-json file://task-def-jmeter.json

Step 8: Create ADO service connection to AWS
  ADO Project Settings → Service Connections → AWS → Assume Role
```

### CI Pipeline (Automated Image Builds)

```yaml
# .azure/infra/build-images.yml — triggers only on dependency changes
trigger:
  paths:
    include:
      - testExecution/package-lock.json
      - testExecution/Dockerfile*
      - testExecution/api-e2e-testing/package-lock.json

steps:
  - script: |
      docker build -f Dockerfile.browser -t carity-browser-runner:$(Build.SourceVersion) .
      docker build -f Dockerfile.api -t carity-api-runner:$(Build.SourceVersion) .
      # Push to ECR...
```

**Image rebuilds happen ~1-2 times per month.** Daily code changes use the code-bundle pattern
(tar + S3 upload in 5 seconds) or monolithic rebuild (<60s with layer caching).

---

## Cost Breakdown — Detailed by Test Type

### Fargate Pricing (us-east-1)
- vCPU: $0.04048 per vCPU per hour
- Memory: $0.004445 per GB per hour
- Billed per second (minimum 1 minute)

---

### Your Usage Pattern

| Suite | Frequency | Envs | Runs/Month |
|-------|-----------|------|------------|
| Regression (54 modules) | 2x weekly | 1 | 8 |
| Smoke (27 UJTs) | Every deploy | 3-5 | 50 |
| API E2E (170 files, 4 shards) | Every deploy | 3 | 50 |
| JMeter (perf) | Weekly | 1 | 4 |
| 508/WCAG (8 browser combos) | Weekly | 1 | 4 |

---

### Cost Per Run

| Test Type | Tasks | Duration | CPU | Memory | Cost/Run |
|-----------|-------|----------|-----|--------|----------|
| **Regression** | 54 parallel | 8 min each | 2 vCPU | 4 GB | **$0.70** |
| **Smoke** | 1 | 15 min | 2 vCPU | 4 GB | **$0.025** |
| **API E2E** | 4 shards | 10 min each | 1 vCPU | 2 GB | **$0.033** |
| **JMeter** | 4 workers | 20 min each | 4 vCPU | 8 GB | **$0.72** |
| **508/WCAG** | 8 parallel | 20 min each | 2 vCPU | 4 GB | **$0.26** |

**Calculation example (Regression):**
```
Per task: (2 × $0.04048 + 4 × $0.004445) × (8/60) hours = $0.013
54 tasks: 54 × $0.013 = $0.70
```

---

### Monthly Cost Summary

| Component | Calculation | Monthly |
|-----------|-------------|---------|
| **Regression** | 8 runs × $0.70 | $5.60 |
| **Smoke** | 50 runs × $0.025 | $1.25 |
| **API E2E** | 50 runs × $0.033 | $1.65 |
| **JMeter** | 4 runs × $0.72 | $2.88 |
| **508/WCAG** | 4 runs × $0.26 | $1.04 |
| **ECR storage** (3 images, ~2.2 GB) | 2.2 × $0.10 | $0.22 |
| **S3** (reports, 90-day retention) | ~15 GB | $0.35 |
| **CloudWatch Logs** (30-day retention) | ~3 GB | $1.50 |
| **Secrets Manager** | 1 secret | $0.40 |
| **CloudFront** | Internal traffic | $0.00 |
| | | |
| **TOTAL** | | **$14.89/month** |

---

### Current vs. Serverless — Annual Comparison

| | Current (Agents) | Serverless (Fargate) | Savings |
|---|---|---|---|
| Monthly | $650–1,900 | ~$15 | $635–1,885 |
| Annual | $7,800–22,800 | ~$180 | **$7,620–22,620** |
| 3-Year | $23,400–68,400 | ~$540 | **$22,860–67,860** |

Even with the most conservative agent estimate ($650/mo), serverless saves **$7,600+/year**.

---

### Growth Scenario — What If Usage Doubles?

| Scenario | Monthly Cost |
|----------|-------------|
| Current usage (as above) | $15 |
| Double deployments (100 smoke + 100 API) | $21 |
| Daily regression instead of 2x/week | $35 |
| Add 3 more environments for smoke | $18 |
| All of the above combined | $55 |
| **Worst case: 500 runs/month total** | **$80** |

Even at extreme scale, you stay under $100/month — still 85-95% cheaper than agents.

---

## Docker Image Strategy — What Gets Built When

### The Three Images

| Image | Size | Contains | Rebuild Trigger | Frequency |
|-------|------|----------|----------------|-----------|
| `carity-browser-runner` | ~1.5 GB | Node + Playwright + Chromium + test code | `package-lock.json` or `Dockerfile` change | 1-2x/month |
| `carity-api-runner` | ~200 MB | Node + mssql + xlsx (no browser) | `api-e2e-testing/package-lock.json` | 1-2x/month |
| `carity-jmeter-runner` | ~500 MB | Java + JMeter + plugins | JMeter version update | Quarterly |

### Code Push ≠ Docker Build

```
95% of pushes (test code changes):
  Option A: Docker layer cache rebuild — 30-60 seconds
  Option B: Code bundle to S3 — 5 seconds (no Docker at all)

5% of pushes (dependency changes):
  Full Docker rebuild — 3-5 minutes
```

**Key insight:** Your test code (specs, pages, locators) lives in the last Docker layer.
When only test code changes, Docker rebuilds just that layer (~30s) and reuses
the cached node_modules and browser binaries from earlier layers.

### Recommended: Start Monolithic, Evolve to Code-Bundle

| Phase | Strategy | When |
|-------|----------|------|
| Phase 1 (now) | Monolithic image (code baked in) | Simple, 30-60s deploys |
| Phase 2 (later) | Base image + code bundle from S3 | 5-second deploys, multi-branch support |

Both work with the same entrypoint and pipeline templates. The switch is transparent.

---

## Architecture — How It All Connects

```
┌─────────────── ADO (Trigger + Reporting) ───────────────┐
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Pipeline runs → calls AWS CLI → launches task     │  │
│  │  Pipeline polls → streams CloudWatch logs to ADO   │  │
│  │  Pipeline downloads → publishes reports + JUnit    │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────┘
                         │ aws ecs run-task
                         ▼
┌─────────────── AWS Account (202699424083) ──────────────────────────┐
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ECS Cluster: carity-test-execution                            │  │
│  │                                                                │  │
│  │  Task Definitions:                                             │  │
│  │    carity-browser-runner  (UI + 508 tests)                     │  │
│  │    carity-api-runner      (API E2E tests)                      │  │
│  │    carity-jmeter-runner   (Performance tests)                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────┐  ┌───────────────┐  ┌───────────────────────┐ │
│  │ ECR (3 images)   │  │ S3 Bucket     │  │ Secrets Manager       │ │
│  │                   │  │               │  │                       │ │
│  │ browser:latest    │  │ suites/       │  │ carity-tests/std-f1   │ │
│  │ api:latest        │  │ runs/         │  │ carity-tests/dev-f5   │ │
│  │ jmeter:latest     │  │ code-bundles/ │  │ carity-tests/me-qc    │ │
│  └──────────────────┘  └───────┬───────┘  └───────────────────────┘ │
│                                 │                                     │
│                          CloudFront                                   │
│                          (HTML report access)                         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  VPC: vpc-08528a0502a0f3891                                    │  │
│  │  Subnets: subnet-048fe8ca0c8aea9b3, subnet-0b4666247f81b7f36  │  │
│  │                                                                │  │
│  │  Access:                                                       │  │
│  │    ✅ RDS (SQL Server) — direct VPC                            │  │
│  │    ✅ S3 — VPC Gateway Endpoint                                │  │
│  │    ✅ ECR, Secrets Manager, CloudWatch — AWS internal          │  │
│  │    ✅ Carity Web App — Lambda Proxy (in-container)             │  │
│  │    ❌ Public internet — no NAT, no egress                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Report Access — Where to Find Everything

| What | Where | How to Access |
|------|-------|---------------|
| HTML Report | S3 → CloudFront | URL in pipeline output: `https://cf-domain/runs/{task-id}/index.html` |
| JUnit Results | ADO Test Results tab | Same as today — pipeline publishes them |
| Build Artifacts | ADO Artifacts tab | Same as today — downloaded from S3, published to ADO |
| Real-time Logs | CloudWatch | AWS Console or `aws logs tail /ecs/carity-tests --follow` |
| Logs in ADO | Pipeline build log | Streamed from CloudWatch during poll step |
| VPAT 508 Report | S3 → CloudFront | Alongside HTML report in same run folder |
| JMeter Dashboard | S3 → CloudFront | `https://cf-domain/runs/{task-id}/index.html` (JMeter HTML report) |
| Network Share | Optional | Pipeline can still copy to `\\fei\department\...` if needed |

**Team experience is unchanged.** Same ADO buttons, same Reports tab, same Artifacts.
The only addition is a CloudFront URL for quick sharing without VPN.

---

## Security — Complete Posture

| Layer | Current (Agents) | Serverless (Fargate) |
|-------|-------------------|---------------------|
| **Credentials** | `.env` files on agent disk | Secrets Manager (encrypted at rest, IAM-gated) |
| **Rotation** | Manual (never rotated) | Automatic rotation schedule |
| **Network** | VPN tunnel from corporate network | Private subnets, no internet, no public IP |
| **Isolation** | Shared machine, multiple pipelines | Fresh container per run, destroyed after |
| **Audit** | ADO build logs only | CloudTrail + CloudWatch (who ran what, when) |
| **Image security** | Whatever's installed on agent | ECR vulnerability scanning on every push |
| **Access control** | ADO pipeline permissions | IAM roles (least privilege per task) |
| **Data at rest** | Reports on network share (unencrypted) | S3 (SSE-S3 encrypted by default) |
| **Data in transit** | Mixed HTTP/HTTPS | All HTTPS + internal VPC traffic |

### IAM Roles — What Each Can Do

```
Task Execution Role (ECS uses to start the container):
  ├── ecr:GetDownloadUrlForLayer (pull image)
  ├── ecr:BatchGetImage
  ├── secretsmanager:GetSecretValue (inject secrets as env vars)
  └── logs:CreateLogStream + PutLogEvents

Task Role (what the running container can do):
  ├── s3:PutObject on runs/* (upload reports)
  ├── s3:GetObject on suites/*/code-*.tar.gz (pull code bundle)
  ├── lambda:InvokeFunction on DcDHCF-*-Carity-WebLambda* (browser proxy)
  └── NOTHING ELSE (no ec2, no iam, no admin)

ADO Service Connection:
  └── ecs:RunTask + ecs:DescribeTasks + s3:GetObject + logs:GetLogEvents
      (can trigger and monitor tasks, download reports — cannot modify infra)
```

---

## Pipeline Examples — All Four Test Types

### Smoke (UI) — Every Deployment

```yaml
# Uses template: .azure/templates/run-ecs-module.yml
- template: templates/run-ecs-module.yml
  parameters:
    moduleName: 'smoke'
    testCommand: 'npx playwright test tests/smoke/ --project=smoke-ujt --workers=1'
    environment: ${{ parameters.Environment }}
    taskDefinition: 'carity-browser-runner'
    cpu: '2048'
    memory: '4096'
    timeoutMinutes: 30
```

### API E2E — Every Deployment (4 Shards)

```yaml
# Launch 4 parallel shards
- ${{ each shard in parameters.shardList }}:
  - template: templates/run-ecs-module.yml
    parameters:
      moduleName: 'api-e2e-shard-${{ shard }}'
      testCommand: 'npx playwright test excel-driven-e2e --shard=${{ shard }}/4 --workers=1'
      environment: ${{ parameters.Environment }}
      taskDefinition: 'carity-api-runner'
      cpu: '1024'
      memory: '2048'
      timeoutMinutes: 20
```

### JMeter — Weekly Performance

```yaml
- template: templates/run-ecs-module.yml
  parameters:
    moduleName: 'perf-load-test'
    testCommand: '/opt/apache-jmeter-5.6.3/bin/jmeter -n -t jmeter/carity-api-load.jmx -Jthreads=50 -Jduration=600'
    environment: ${{ parameters.Environment }}
    taskDefinition: 'carity-jmeter-runner'
    cpu: '4096'
    memory: '8192'
    timeoutMinutes: 30
```

### 508/Accessibility — Weekly (8 Parallel Browser Combos)

```yaml
# Launch 8 parallel tasks — one per browser/viewport
- ${{ each project in split('smoke-a11y,smoke-a11y-firefox,smoke-a11y-webkit,smoke-a11y-tablet,smoke-a11y-mobile-iphone,smoke-a11y-mobile-android,smoke-a11y-1366x768,smoke-a11y-2560x1440', ',') }}:
  - template: templates/run-ecs-module.yml
    parameters:
      moduleName: 'a11y-${{ project }}'
      testCommand: 'npx playwright test --project=${{ project }} --workers=1'
      environment: ${{ parameters.Environment }}
      taskDefinition: 'carity-browser-runner'
      cpu: '2048'
      memory: '4096'
      timeoutMinutes: 40
```

---

## Migration Roadmap

| Week | What | Test Types Covered | Risk | Rollback |
|------|------|-------------------|------|----------|
| 1 | Push browser image to ECR, create ECS cluster + task def | — | Low | Delete resources |
| 2 | Serverless smoke pipeline (run alongside agent version) | UI Smoke | None | Old pipeline still works |
| 3 | Validate: same reports, same JUnit, same ADO results | UI Smoke | Low | Revert YAML |
| 4 | Regression parent (54 parallel modules) | UI Regression | Low | Old parent still works |
| 5 | API E2E image + pipeline (4-shard serverless) | API | Low | Old MS-hosted pipeline works |
| 6 | 508/WCAG (8 browser combos in parallel) | Accessibility | Low | Part of browser runner |
| 7 | JMeter image + pipeline | Performance | Low | New capability |
| 8 | Deprecate agent-based pipelines | All | Medium | Re-enable old |
| 9 | Code-bundle split (5-second deploys) | All | Low | Keep monolithic |
| 10 | Intelligent test selection (run affected only) | UI, API | Low | Fall back to full suite |

**Principle:** Old and new run in parallel until validated. No big-bang cutover.

---

## Future Enhancements

| Enhancement | Benefit | Effort |
|-------------|---------|--------|
| **Trigger Lambda API** | Start any suite via HTTP (webhook, Slack, UI button) | 2 days |
| **Landing Page UI** | Dashboard showing all runs, reports, pass/fail per module | 1 week |
| **Slack/Teams notifications** | Instant failure alerts with report links | 1 day |
| **Scheduled runs (EventBridge)** | Cron-triggered regression + perf without ADO | 1 day |
| **Run-specific code bundles** | Test against any commit/branch without image rebuild | 2 days |
| **Intelligent test selection** | Run only affected tests on code push | 1 week |
| **Dependency graph** | Auto-resolve which tests need to run per change | 3 days |
| **CloudFront signed URLs** | Secure report access without VPN | 1 day |
| **Cost dashboard** | Track spend per suite/module in CloudWatch | 1 day |
| **Auto-scaling JMeter** | Scale workers based on target load | 2 days |

---

## Summary — One-Page Decision

### What to build
- 3 Docker images (browser, API, JMeter) in ECR
- 1 ECS Fargate cluster with task definitions
- 1 S3 bucket for reports + CloudFront distribution
- Modified ADO pipelines (trigger ECS instead of running locally)

### Why it's better
- **98% cost reduction** ($15/mo vs. $650+/mo)
- **6x faster** regression (54 parallel vs. 9 batched)
- **Zero idle waste** (pay only when running)
- **Better security** (Secrets Manager, ephemeral containers, no shared agents)
- **Same team UX** (same ADO buttons, same reports, same notifications)

### How to build
- Week 1-3: Infrastructure + smoke validation
- Week 4-6: All test types running serverless
- Week 7-8: Deprecate agents
- Total: ~2 months to full migration, zero downtime

### The cost

| | Current | Serverless | Saving |
|---|---|---|---|
| Monthly | $650–1,900 | $15 | 97-99% |
| Annual | $7,800–22,800 | $180 | $7,620–22,620 |
| Setup effort | — | 3-5 days | One-time |
