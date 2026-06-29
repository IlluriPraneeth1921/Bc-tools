# pl-test Deployment Guide

Step-by-step instructions for deploying the Pipeline Verification Tool to an AWS account.

---

## Prerequisites

### Tools Required

| Tool | Version | Purpose |
|------|---------|---------|
| AWS CLI | v2+ | AWS account access |
| Node.js | 18+ | CDK runtime |
| Docker Desktop | Latest | Container image build (ARM64 emulation) |
| AWS CDK | v2 | Infrastructure as code |

### AWS Access Rights Required

The deploying IAM user/role needs these permissions:

| Service | Permissions | Purpose |
|---------|-------------|---------|
| CloudFormation | Full access | Stack creation/updates |
| ECS | Full access | Cluster, service, task definitions |
| EC2 | Describe VPCs/Subnets/Security Groups | VPC lookup; SG creation |
| Elastic Load Balancing | Full access | ALB + target groups |
| ECR | Push/pull images | Container image registry |
| Secrets Manager | Create/read secrets | DB and app credentials |
| S3 | Read/write on test bucket | Test file storage |
| IAM | Create roles/policies | Task execution role, task role |
| CloudWatch Logs | Create log groups | Container logs |
| SSM (Parameter Store) | Read | CDK bootstrap version check |

Easiest approach: use `AdministratorAccess` or a role with `arn:aws:iam::aws:policy/PowerUserAccess` plus IAM permissions.

### AWS Account Setup (One-Time)

```powershell
# 1. Configure AWS CLI for the target account
aws configure
# or use SSO:
aws sso login --profile your-profile

aws rds describe-db-instances --query "DBInstances[?Endpoint.Address=='mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com'].VpcSecurityGroups[*].VpcSecurityGroupId" --output text
sg-06f7983a7a3b4b385    sg-0afa76dad58771ec1                   <<== Add these to env.json
aws rds describe-db-instances --query "DBInstances[?Endpoint.Address=='mcs-mst-carity-v1-3e4fe-appdb.c2ry8emwq4ie.us-east-1.rds.amazonaws.com'].VpcSecurityGroups[*].VpcSecurityGroupId" --output text

# 2. Bootstrap CDK in the target account/region (one-time per account+region)
cd deploy/cdk
npx cdk bootstrap aws://ACCOUNT_ID/REGION
```

---

## Supported Interfaces

The tool verifies the following data pipeline interfaces:

| Interface | Type | Stages Tested | Description |
|-----------|------|---------------|-------------|
| ICD-D06 | PSV (pipe-separated) | 1, 2, 3, 4 | Medicaid Provider File |
| ICD-D12 | Fixed-width TXT | 1, 2, 4 | FSIA Adult Functional Screen File |

### ICD-D12 Stage Pipeline

ICD-D12 skips Stage 3. Data flows directly from Stage 2 (parsed fields in Interface DB) to Stage 4 (CustomFormModule tables in Carity DB):

```
Source File → Stage 1 (raw) → Stage 2 (parsed) → Stage 4 (CustomFormModule)
```

Stage 4 targets:
- `CustomFormModule.CustomFormInstance` (CustomFormDefinitionKey: `EA2E961E-FCEE-4023-8F82-5EFF695F8687`, Version 55)
- `CustomFormModule.CaseCustomFormInstance`
- `CustomFormModule.FieldAnswerBase`
- `CustomFormModule.SimpleSingleSelectFieldAnswer`
- `CustomFormModule.DateFieldAnswer`
- `PersonModule.PersonEmployment`

---

## Configuration

### Environment Files

Deployment is now driven by **environment configuration files** in `deploy/cdk/environments/`. Each environment has its own JSON file:

```
deploy/cdk/environments/
├── qc.json          # QC non-PHI environment
└── qc-phi.json      # QC PHI environment
```

Select the target environment at deploy time with the `-c env=<name>` flag.

### Environment Config Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `stage` | No | Environment stage tag | `qc` |
| `serviceName` | No | Service name tag (default: `pl-test`) | `pl-test` |
| `customer` | No | Customer tag | `widhs` |
| `vpcId` | Yes | VPC to deploy into | `vpc-08528a0502a0f3891` |
| `availabilityZones` | Yes | AZs matching the subnets | `["us-east-1a", "us-east-1b"]` |
| `privateSubnetIds` | Yes | At least 2 private subnets | `["subnet-aaa", "subnet-bbb"]` |
| `s3BucketName` | Yes | S3 bucket for test files | `widhs-v3-04065-pl-tester` |
| `s3TestFilePrefix` | No | Prefix/folder in the bucket (default: `test-files/`) | `test-files/` |
| `dbServer` | Yes | SQL Server RDS endpoint | `mydb.abc123.us-east-1.rds.amazonaws.com` |
| `interfaceDbName` | Yes | Interface database name (Stages 1-3) | `WiDHS.Qc.Interface.Carity.ToolTesting` |
| `carityDbName` | Yes | Carity database name (Stage 4) | `WiDHS.Qc.Carity.ToolTestig` |
| `dbUsername` | Yes | SQL Server username | `WiDHS-Qc-Carity-WebLambdaUser` |
| `mcdIdPrefix` | No | MCD ID prefix for data isolation (default: `000000000`) | `000000000` |

### Example Environment File

```json
{
  "stage": "qc",
  "serviceName": "pl-test",
  "customer": "widhs",

  "vpcId": "vpc-08528a0502a0f3891",
  "availabilityZones": ["us-east-1a", "us-east-1b"],
  "privateSubnetIds": ["subnet-048fe8ca0c8aea9b3", "subnet-0b4666247f81b7f36"],
  "s3BucketName": "widhs-v3-04065-pl-tester",
  "s3TestFilePrefix": "test-files/",
  "dbServer": "mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com",
  "interfaceDbName": "WiDHS.Qc.Interface.Carity.ToolTesting",
  "carityDbName": "WiDHS.Qc.Carity.ToolTestig",
  "dbUsername": "WiDHS-Qc-Carity-WebLambdaUser",
  "mcdIdPrefix": "000000000"
}
```

### Overriding Config Values

Individual values can be overridden via `-c` flags (takes precedence over the environment file):

```powershell
npx cdk deploy -c env=qc -c dbServer=new-server.rds.amazonaws.com
```

---

## Deployment Steps

### Step 1: Install CDK Dependencies

```powershell
cd deploy/cdk
npm install
```

### Step 2: Review Changes

```powershell
npx cdk synth -c env=qc    # generates CloudFormation template
npx cdk diff -c env=qc     # shows what will change
```

### Step 3: Deploy

```powershell
npx cdk deploy -c env=qc
```

The stack name will be `PlTestStack-qc` (based on the environment name).

This creates:
- ECS Cluster + Fargate Service (ARM64/Graviton)
- Internal Application Load Balancer (ports 80 and 8000)
- Secrets Manager secrets (DB credentials + app login)
- CloudWatch Log Group
- IAM roles with least-privilege policies
- Security groups
- Resource tags: `bc:stage`, `bc:service`, `bc:customer`

### Step 4: Update Database Credentials

CDK generates a random DB password. Replace it with the actual credentials:

```powershell
# Create a JSON file with the real credentials
@'
{
  "SecretId": "pl-test/db-credentials",
  "SecretString": "{\"server\":\"YOUR_DB_SERVER\",\"username\":\"YOUR_DB_USER\",\"password\":\"YOUR_DB_PASSWORD\",\"interfaceDb\":\"YOUR_INTERFACE_DB\",\"carityDb\":\"YOUR_CARITY_DB\"}"
}
'@ | Out-File -Encoding utf8 put-secret.json

aws secretsmanager put-secret-value --cli-input-json file://put-secret.json
Remove-Item put-secret.json
```

### Step 5: Add ECS Security Group to RDS Inbound Rules

The CDK deploy outputs the ECS service security group ID. Add it to your RDS security group:

```powershell
# Get the ECS service security group from stack outputs
aws cloudformation describe-stacks --stack-name PlTestStack-qc --query "Stacks[0].Outputs[?OutputKey=='EcsServiceSecurityGroup'].OutputValue" --output text

# Add inbound rule to RDS security group
aws ec2 authorize-security-group-ingress `
  --group-id sg-YOUR_RDS_SECURITY_GROUP `
  --ip-permissions "IpProtocol=tcp,FromPort=1433,ToPort=1433,UserIdGroupPairs=[{GroupId=sg-ECS_SERVICE_SG,Description=from pl-test ECS service}]"
```

### Step 6: Create Database Schema

Run the DDL scripts on the Interface database to create the `[TestVerification]` schema:

```powershell
# Execute in order on the Interface DB
sqlcmd -S YOUR_DB_SERVER -d "YOUR_INTERFACE_DB" -U YOUR_USER -P YOUR_PASS -i pl-test/database/001_create_schema.sql
sqlcmd -S YOUR_DB_SERVER -d "YOUR_INTERFACE_DB" -U YOUR_USER -P YOUR_PASS -i pl-test/database/002_create_test_run.sql
sqlcmd -S YOUR_DB_SERVER -d "YOUR_INTERFACE_DB" -U YOUR_USER -P YOUR_PASS -i pl-test/database/003_create_mismatch_report.sql
sqlcmd -S YOUR_DB_SERVER -d "YOUR_INTERFACE_DB" -U YOUR_USER -P YOUR_PASS -i pl-test/database/004_create_expected_state_stage1.sql
sqlcmd -S YOUR_DB_SERVER -d "YOUR_INTERFACE_DB" -U YOUR_USER -P YOUR_PASS -i pl-test/database/005_create_expected_state_stage2.sql
sqlcmd -S YOUR_DB_SERVER -d "YOUR_INTERFACE_DB" -U YOUR_USER -P YOUR_PASS -i pl-test/database/006_create_expected_state_stage3.sql
sqlcmd -S YOUR_DB_SERVER -d "YOUR_INTERFACE_DB" -U YOUR_USER -P YOUR_PASS -i pl-test/database/007_create_expected_state_stage4.sql
sqlcmd -S YOUR_DB_SERVER -d "YOUR_INTERFACE_DB" -U YOUR_USER -P YOUR_PASS -i pl-test/database/008_create_cleanup_procedures.sql
```

### Step 7: Grant DB Permissions

The SQL user needs access to both databases:

```sql
-- Interface DB: TestVerification schema + CustomerInterfaceModule read
USE [YOUR_INTERFACE_DB];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[TestVerification] TO [YOUR_DB_USER];
GRANT EXECUTE ON SCHEMA::[TestVerification] TO [YOUR_DB_USER];
GRANT SELECT ON SCHEMA::[CustomerInterfaceModule] TO [YOUR_DB_USER];

-- Carity DB: CustomFormModule + PersonModule read (for Stage 4 verification)
USE [YOUR_CARITY_DB];
GRANT SELECT ON SCHEMA::[CustomFormModule] TO [YOUR_DB_USER];
GRANT SELECT ON SCHEMA::[PersonModule] TO [YOUR_DB_USER];
```

### Step 8: Upload Test Files to S3

```powershell
# ICD-D06 test files
aws s3 cp data/icd_D06/WI_PROV_FILE_EXTRACT_T.psv s3://YOUR_BUCKET/test-files/

# ICD-D12 test files
aws s3 cp data/icd_D12/WI_FSIA_FILE_EXTRACT_T.txt s3://YOUR_BUCKET/test-files/
```

### Step 9: Retrieve Login Credentials

```powershell
aws secretsmanager get-secret-value --secret-id pl-test/app-credentials --query "SecretString" --output text
```

### Step 10: Access the Application

The ALB URL is in the CDK deploy output:

```powershell
aws cloudformation describe-stacks --stack-name PlTestStack-qc --query "Stacks[0].Outputs[?OutputKey=='StreamlitUrl'].OutputValue" --output text
```

---

## Building & Pushing Docker Images

For manual image builds (outside CDK's asset pipeline):

```powershell
cd deploy
.\build-and-push.ps1 -Tag "latest"
```

This script:
1. Creates the ECR repository if it doesn't exist
2. Authenticates to ECR
3. Builds an ARM64 image using `docker buildx`
4. Pushes to `<account>.dkr.ecr.us-east-1.amazonaws.com/pl-test:latest`

---

## Local Development (Docker Compose)

Run the application locally against a remote database:

```powershell
# 1. Copy environment file
cp deploy/.env.example deploy/.env
# 2. Edit deploy/.env with your credentials

# 3. Run from workspace root
docker-compose -f deploy/docker-compose.yml up --build
```

Access locally at:
- Streamlit UI: http://localhost:8501
- FastAPI: http://localhost:8000
- API docs: http://localhost:8000/docs

---

## Post-Deployment Verification

```powershell
# Check ECS service health (replace env name)
aws ecs describe-services --cluster pl-test-cluster --service pl-test-service --query "services[0].{Running:runningCount,Status:status}"

# Check container logs
aws logs tail /ecs/pl-test --since 5m

# Check target group health
aws elbv2 describe-target-health --target-group-arn $(aws elbv2 describe-target-groups --names PlTest-ALBAp --query "TargetGroups[0].TargetGroupArn" --output text)
```

---

## Deploying to Multiple Environments

Each environment gets its own CloudFormation stack:

```powershell
# Deploy to QC
npx cdk deploy -c env=qc

# Deploy to QC-PHI
npx cdk deploy -c env=qc-phi
```

To list available environments:

```powershell
Get-ChildItem deploy/cdk/environments/*.json | ForEach-Object { $_.BaseName }
```

To add a new environment, create `deploy/cdk/environments/<name>.json` with the required parameters.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Missing required context: env` | No environment specified | Add `-c env=qc` to CDK command |
| `Environment config not found` | Typo in environment name | Check `deploy/cdk/environments/` for available files |
| `exec format error` during build | QEMU not registered | `docker run --rm --privileged multiarch/qemu-user-static --reset -p yes` |
| `Login timeout expired` in logs | ECS can't reach RDS | Add ECS SG to RDS inbound rules (Step 5) |
| `API error 500` on all pages | DB schema missing | Run DDL scripts (Step 6) |
| `EXECUTE permission denied` | DB user lacks permissions | Grant schema permissions (Step 7) |
| `invalid character` secret error | Malformed JSON in Secrets Manager | Re-put secret using `--cli-input-json file://` approach (Step 4) |
| CDK deploy hangs 5+ min | Target group deregistration delay | Normal; wait for it to complete |
| S3 file list empty | Missing S3 permissions or wrong bucket | Check `s3BucketName` in environment config |
| Stage 3 shows 0 checks for D12 | Expected behavior | ICD-D12 skips Stage 3 (data flows Stage 2 → Stage 4) |

---

## Updating the Application

```powershell
# Deploy updated code to a specific environment
cd deploy/cdk
npx cdk deploy -c env=qc
```

CDK handles image build and push as part of `cdk deploy` (Docker asset bundling).

---

## Tear Down

```powershell
npx cdk destroy -c env=qc
```

This removes all resources for the specified environment. Database schema and S3 test files are NOT affected.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ VPC (private subnets only)                                      │
│                                                                 │
│  ┌──────────────────────────────────────┐                       │
│  │ Internal ALB                         │                       │
│  │  :80  → Streamlit (8501)             │                       │
│  │  :8000 → FastAPI (8000)              │                       │
│  └──────────────┬───────────────────────┘                       │
│                 │                                                │
│  ┌──────────────▼───────────────────────┐                       │
│  │ ECS Fargate Task (ARM64/Graviton)    │                       │
│  │  ┌─────────────┐  ┌──────────────┐   │                       │
│  │  │ FastAPI     │  │ Streamlit    │   │                       │
│  │  │ :8000       │  │ :8501        │   │                       │
│  │  └─────────────┘  └──────────────┘   │                       │
│  └──────────────────────────────────────┘                       │
│                 │                                                │
│  ┌──────────────▼──────┐  ┌───────────────────┐                 │
│  │ RDS SQL Server      │  │ S3 Bucket         │                 │
│  │ (Interface + Carity)│  │ (test files)      │                 │
│  └─────────────────────┘  └───────────────────┘                 │
│                                                                 │
│  ┌─────────────────────┐                                        │
│  │ Secrets Manager     │                                        │
│  │ • db-credentials    │                                        │
│  │ • app-credentials   │                                        │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow by Interface

```
ICD-D06 (Provider File):
  .psv file → Stage 1 (raw) → Stage 2 (parsed) → Stage 3 (IncomingPerson) → Stage 4 (Carity)

ICD-D12 (FSIA Functional Screen):
  .txt file → Stage 1 (raw) → Stage 2 (parsed) → Stage 4 (CustomFormModule in Carity)
                                                   ↑ Stage 3 skipped
```

---

## Assumptions

1. Target VPC has at least 2 private subnets with outbound internet access (via NAT gateway, Transit Gateway, or VPC endpoints for ECR/S3/Secrets Manager/CloudWatch)
2. RDS SQL Server instance is accessible from the VPC's private subnets
3. S3 bucket for test files already exists in the same account/region
4. CDK has been bootstrapped in the target account/region
5. Docker Desktop is installed locally with ARM64 emulation support
6. The `[TestVerification]` database schema will be created manually (Step 6)
7. The deploying user has credentials that can assume the CDK roles
8. For ICD-D12 Stage 4 verification, the `CustomFormDefinition` record with key `EA2E961E-FCEE-4023-8F82-5EFF695F8687` (Version 55) exists in the Carity DB

---

## Estimated Monthly Cost

| Resource | Cost |
|----------|------|
| ECS Fargate (0.5 vCPU, 1GB, ARM64) | ~$15/mo |
| Application Load Balancer | ~$16/mo |
| Secrets Manager (2 secrets) | ~$1/mo |
| CloudWatch Logs (2 weeks retention) | ~$1/mo |
| S3 (test files, minimal) | <$1/mo |
| **Total** | **~$34/mo** |

*Cost is per environment. Deploying both qc and qc-phi doubles the infrastructure cost.*
