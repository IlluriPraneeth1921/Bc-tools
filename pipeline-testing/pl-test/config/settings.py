"""
Configuration settings for the Pipeline Tester application.
Reads from environment variables with fallback defaults for local development.
"""
import os
from dotenv import load_dotenv

load_dotenv()


# AWS Settings
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "widhs-v3-04065-pl-tester")
S3_TEST_FILE_PREFIX = os.getenv("S3_TEST_FILE_PREFIX", "test-files/")

# Database Connection Strings
# Raw Staging DB
RAW_STAGING_DB_HOST = os.getenv("RAW_STAGING_DB_HOST", "Carity.db.lower-widhs.aws.feisystems.com")
RAW_STAGING_DB_PORT = int(os.getenv("RAW_STAGING_DB_PORT", "1433"))
RAW_STAGING_DB_NAME = os.getenv("RAW_STAGING_DB_NAME", "WiDHS.Qc.Interface.Carity.ToolTesting")
RAW_STAGING_DB_USER = os.getenv("RAW_STAGING_DB_USER", "WiDHS-Qc-Carity-WebLambdaUser")
RAW_STAGING_DB_PASSWORD = os.getenv("RAW_STAGING_DB_PASSWORD", "R2b9zj970ZXZjY0SrzaW")

# Staged/Mapped DB
STAGED_DB_HOST = os.getenv("STAGED_DB_HOST", "Carity.db.lower-widhs.aws.feisystems.com")
STAGED_DB_PORT = int(os.getenv("STAGED_DB_PORT", "1433"))
STAGED_DB_NAME = os.getenv("STAGED_DB_NAME", "WiDHS.Qc.Interface.Carity.ToolTesting")
STAGED_DB_USER = os.getenv("STAGED_DB_USER", "WiDHS-Qc-Carity-WebLambdaUser")
STAGED_DB_PASSWORD = os.getenv("STAGED_DB_PASSWORD", "R2b9zj970ZXZjY0SrzaW")

# Carity (Blue Compass) DB
CARITY_DB_HOST = os.getenv("CARITY_DB_HOST", "Carity.db.lower-widhs.aws.feisystems.com")
CARITY_DB_PORT = int(os.getenv("CARITY_DB_PORT", "1433"))
CARITY_DB_NAME = os.getenv("CARITY_DB_NAME", "WiDHS.Qc.Carity.ToolTestig")
CARITY_DB_USER = os.getenv("CARITY_DB_USER", "WiDHS-Qc-Carity-WebLambdaUser")
CARITY_DB_PASSWORD = os.getenv("CARITY_DB_PASSWORD", "R2b9zj970ZXZjY0SrzaW")

# Test Verification DB (where expected state + mismatch reports live)
VERIFICATION_DB_HOST = os.getenv("VERIFICATION_DB_HOST", "Carity.db.lower-widhs.aws.feisystems.com")
VERIFICATION_DB_PORT = int(os.getenv("VERIFICATION_DB_PORT", "1433"))
VERIFICATION_DB_NAME = os.getenv("VERIFICATION_DB_NAME", "WiDHS.Qc.Interface.Carity.ToolTesting")
VERIFICATION_DB_USER = os.getenv("VERIFICATION_DB_USER", "WiDHS-Qc-Carity-WebLambdaUser")
VERIFICATION_DB_PASSWORD = os.getenv("VERIFICATION_DB_PASSWORD", "R2b9zj970ZXZjY0SrzaW")

# Data Isolation
MCD_ID_RANGE_START = os.getenv("MCD_ID_RANGE_START", "900000000000001")
MCD_ID_RANGE_END = os.getenv("MCD_ID_RANGE_END", "900000000099999")
