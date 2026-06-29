# pl-test CDK Infrastructure

AWS CDK (TypeScript) project that deploys pl-test to ECS Fargate on Graviton (ARM64).

## Architecture

- **ECS Fargate** (ARM64/Graviton) — runs the container with both FastAPI + Streamlit
- **Application Load Balancer** — port 80 → Streamlit, port 8000 → FastAPI
- **Secrets Manager** — stores DB credentials and app login credentials
- **CloudWatch Logs** — 2-week retention

## Prerequisites

1. Node.js 18+ and npm
2. AWS CDK CLI: `npm install -g aws-cdk`
3. AWS credentials configured (`aws configure` or environment variables)
4. Docker installed (CDK builds the container image)

## Setup

```bash
cd deploy/cdk
npm install
```

## Commands

```bash
# Synthesize CloudFormation template (review before deploying)
npx cdk synth

# Show what would change
npx cdk diff

# Deploy to AWS
npx cdk deploy

# Destroy all resources
npx cdk destroy
```

## Configuration

Before deploying, update the Secrets Manager values:

1. Deploy the stack (creates secrets with generated passwords)
2. Go to AWS Secrets Manager
3. Update `pl-test/db-credentials` with your actual SQL Server username/password
4. Update `pl-test/app-credentials` with the web UI password you want QA to use

## Outputs

After deployment, the stack outputs:
- `StreamlitUrl` — The URL to access the web UI
- `ApiUrl` — The URL to access the FastAPI backend
- `DbSecretArn` — The ARN of the DB credentials secret

## Cost Estimate

- Fargate ARM64 (0.5 vCPU, 1GB): ~$15/month
- ALB: ~$18/month
- Secrets Manager: ~$1/month
- Total: ~$34/month
