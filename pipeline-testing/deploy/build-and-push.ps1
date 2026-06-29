# Build ARM64 Docker image and push to ECR
# Usage: .\build-and-push.ps1 [-Tag "latest"]

param(
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

$AccountId = (aws sts get-caller-identity --query Account --output text)
$Region = "us-east-1"
$RepoName = "pl-test"
$RepoUri = "$AccountId.dkr.ecr.$Region.amazonaws.com/$RepoName"

Write-Host "Building and pushing $RepoUri`:$Tag"

# Ensure ECR repository exists
aws ecr describe-repositories --repository-names $RepoName --region $Region 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating ECR repository: $RepoName"
    aws ecr create-repository --repository-name $RepoName --region $Region
}

# Login to ECR
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"

# Build and push ARM64 image using buildx (builds remotely, no local QEMU needed)
Set-Location "$PSScriptRoot\.."
docker buildx build `
    --platform linux/arm64 `
    --file deploy/Dockerfile `
    --tag "${RepoUri}:${Tag}" `
    --push `
    .

Write-Host "Done. Image pushed: ${RepoUri}:${Tag}"
Write-Host "Deploy with: IMAGE_TAG=$Tag npx cdk deploy"
