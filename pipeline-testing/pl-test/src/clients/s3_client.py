"""
S3 client for listing and downloading test files from the configured bucket.
Files are organized by interface type: test-files/{interface_type}/
"""
import boto3
import os
from typing import List, Optional
from botocore.exceptions import ClientError, NoCredentialsError


def get_s3_client():
    """Create an S3 client using default credentials chain."""
    return boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))


def _get_prefix(interface_type: str = None) -> str:
    """Build the S3 prefix for a given interface type."""
    base = os.getenv("S3_TEST_FILE_PREFIX", "test-files/")
    if interface_type:
        return f"{base}{interface_type}/"
    return base


def list_test_files(interface_type: str = None, bucket: str = None) -> List[str]:
    """
    List test files in the S3 bucket for a given interface type.
    Returns a list of filenames (relative to the interface prefix).
    """
    bucket = bucket or os.getenv("S3_BUCKET_NAME", "widhs-v3-04065-pl-tester")
    prefix = _get_prefix(interface_type)

    try:
        s3 = get_s3_client()
        paginator = s3.get_paginator("list_objects_v2")
        files = []
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                filename = key[len(prefix):] if key.startswith(prefix) else key
                if filename:  # skip empty (the prefix directory itself)
                    files.append(filename)
        return sorted(files)
    except (ClientError, NoCredentialsError):
        return []


def download_test_file(filename: str, interface_type: str = None, bucket: str = None) -> Optional[str]:
    """
    Download a test file from S3 and return its content as a string.
    """
    bucket = bucket or os.getenv("S3_BUCKET_NAME", "widhs-v3-04065-pl-tester")
    prefix = _get_prefix(interface_type)
    key = f"{prefix}{filename}"

    try:
        s3 = get_s3_client()
        resp = s3.get_object(Bucket=bucket, Key=key)
        return resp["Body"].read().decode("utf-8")
    except (ClientError, NoCredentialsError):
        return None


def upload_test_file(filename: str, content: bytes, interface_type: str = None, bucket: str = None) -> bool:
    """
    Upload a test file to S3 under the interface type prefix.
    Returns True on success, False on failure.
    """
    bucket = bucket or os.getenv("S3_BUCKET_NAME", "widhs-v3-04065-pl-tester")
    prefix = _get_prefix(interface_type)
    key = f"{prefix}{filename}"

    try:
        s3 = get_s3_client()
        s3.put_object(Bucket=bucket, Key=key, Body=content, ContentType="text/plain")
        return True
    except (ClientError, NoCredentialsError):
        return False


# Backward-compatible aliases
def list_psv_files(bucket: str = None, prefix: str = None) -> List[str]:
    """Legacy alias — lists all files (no interface filter)."""
    return list_test_files(interface_type=None, bucket=bucket)


def download_psv_file(filename: str, bucket: str = None, prefix: str = None) -> Optional[str]:
    """Legacy alias — downloads without interface prefix."""
    return download_test_file(filename, interface_type=None, bucket=bucket)


def upload_psv_file(filename: str, content: bytes, bucket: str = None, prefix: str = None) -> bool:
    """Legacy alias — uploads without interface prefix."""
    return upload_test_file(filename, content, interface_type=None, bucket=bucket)
