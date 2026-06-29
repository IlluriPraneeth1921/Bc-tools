"""
API endpoints for file upload, parsing, and S3 file listing.
Dispatches to the correct interface plugin parser based on interface_type.
"""
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Optional

from src.interfaces import get_interface, list_interfaces
from src.interfaces.base import BaseParsedFile
from src.clients.s3_client import list_test_files, download_test_file, upload_test_file

router = APIRouter()

# In-memory cache of parsed files for the current session
_parsed_files: Dict[str, BaseParsedFile] = {}


class ProviderInfo(BaseModel):
    mcd_id: str
    provider_name: str


class ParseSummary(BaseModel):
    filename: str
    total_lines: int
    total_providers: int
    record_count: int
    provider_ids: List[str]
    provider_names: List[ProviderInfo]
    record_types_found: List[str]


def _build_summary(parsed: BaseParsedFile, filename: str) -> ParseSummary:
    """Build a ParseSummary from a BaseParsedFile."""
    record_types = set(line.record_type for line in parsed.source_lines)

    # Try to get entity names from the parsed file
    provider_names = []
    if hasattr(parsed, "providers"):
        # ICD-D06: providers dict with record_01 containing full name
        for entity_id, group in parsed.providers.items():
            name = ""
            if hasattr(group, "record_01") and group.record_01:
                name = group.record_01.provider_full_name
            provider_names.append(ProviderInfo(mcd_id=entity_id, provider_name=name))
    elif hasattr(parsed, "members"):
        # ICD-D12: members dict with first/last name fields
        for entity_id, member in parsed.members.items():
            name = ""
            if hasattr(member, "first_name") and hasattr(member, "last_name"):
                parts = [member.first_name.strip(), member.last_name.strip()]
                name = " ".join(p for p in parts if p)
            provider_names.append(ProviderInfo(mcd_id=entity_id, provider_name=name))
    else:
        for entity_id in parsed.entity_ids:
            provider_names.append(ProviderInfo(mcd_id=entity_id, provider_name=""))

    return ParseSummary(
        filename=filename,
        total_lines=len(parsed.source_lines),
        total_providers=parsed.entity_count,
        record_count=parsed.record_count,
        provider_ids=parsed.entity_ids,
        provider_names=provider_names,
        record_types_found=sorted(record_types),
    )


@router.get("/s3-list")
async def list_s3_files(interface_type: str = None, refresh: bool = False):
    """
    List test files available in the configured S3 bucket.
    Results are cached server-side for 5 minutes to avoid repeated S3 API calls.
    Pass refresh=true to force a fresh listing.
    """
    import time

    cache_key = f"s3_list_{interface_type or 'all'}"
    cache_ttl = 300  # 5 minutes

    # Check cache
    if not refresh and hasattr(list_s3_files, "_cache"):
        cached = list_s3_files._cache.get(cache_key)
        if cached and (time.time() - cached["timestamp"]) < cache_ttl:
            return {"files": cached["files"], "cached": True}

    # Fetch from S3
    files = list_test_files(interface_type=interface_type)

    # Store in cache
    if not hasattr(list_s3_files, "_cache"):
        list_s3_files._cache = {}
    list_s3_files._cache[cache_key] = {"files": files, "timestamp": time.time()}

    return {"files": files, "cached": False}


@router.post("/s3-load", response_model=ParseSummary)
async def load_from_s3(filename: str, interface_type: str = "icd_d06"):
    """Download and parse a file from S3 using the specified interface plugin."""
    try:
        plugin = get_interface(interface_type)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))

    content = download_test_file(filename, interface_type=interface_type)
    if content is None:
        raise HTTPException(status_code=404, detail=f"File not found in S3: {filename}")

    parser = plugin.create_parser()
    try:
        parsed = parser.parse_content(content, filename=filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {str(e)}")

    _parsed_files[filename] = parsed
    return _build_summary(parsed, filename)


@router.post("/s3-upload", response_model=ParseSummary)
async def upload_to_s3(file: UploadFile = File(...), interface_type: str = "icd_d06"):
    """Upload a file to S3, then parse it using the specified interface plugin."""
    try:
        plugin = get_interface(interface_type)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))

    content = await file.read()

    if not upload_test_file(file.filename, content, interface_type=interface_type):
        raise HTTPException(status_code=500, detail="Failed to upload file to S3.")

    content_str = content.decode("utf-8")
    parser = plugin.create_parser()
    try:
        parsed = parser.parse_content(content_str, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {str(e)}")

    _parsed_files[file.filename] = parsed
    return _build_summary(parsed, file.filename)


@router.post("/upload", response_model=ParseSummary)
async def upload_and_parse(file: UploadFile = File(...), interface_type: str = "icd_d06"):
    """Upload a file and parse it using the specified interface plugin."""
    try:
        plugin = get_interface(interface_type)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))

    content = await file.read()
    content_str = content.decode("utf-8")

    parser = plugin.create_parser()
    try:
        parsed = parser.parse_content(content_str, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {str(e)}")

    _parsed_files[file.filename] = parsed
    return _build_summary(parsed, file.filename)


@router.post("/parse-local", response_model=ParseSummary)
async def parse_local_file(filepath: str, interface_type: str = "icd_d06"):
    """Parse a file from a local path using the specified interface plugin."""
    try:
        plugin = get_interface(interface_type)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File not found: {filepath}")

    parser = plugin.create_parser()
    try:
        parsed = parser.parse_file(filepath)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {str(e)}")

    filename = os.path.basename(filepath)
    _parsed_files[filename] = parsed
    return _build_summary(parsed, filename)


@router.get("/cached")
async def list_cached_files():
    """List files currently cached in memory."""
    return {
        filename: {"providers": p.entity_count, "records": p.record_count}
        for filename, p in _parsed_files.items()
    }


@router.get("/interfaces")
async def list_available_interfaces():
    """List all registered interface types."""
    return {
        "interfaces": [
            {
                "interface_type": p.interface_type,
                "display_name": p.display_name,
                "file_extensions": p.file_extensions,
                "description": p.description,
            }
            for p in list_interfaces()
        ]
    }


@router.get("/infer-interface")
async def infer_interface_type(filename: str):
    """
    Infer the interface type from a filename based on registered plugin patterns.

    Matching priority:
    1. Filename prefix patterns (e.g., WI_PROV_FILE → icd_d06, WI_FSIA_FILE → icd_d12)
    2. File extension (e.g., .psv → icd_d06, .txt → icd_d12)

    Returns the inferred interface_type or null if no match.
    """
    # Strip any directory path to get just the base filename
    base_filename = os.path.basename(filename)

    # Known filename prefix → interface type mappings
    PREFIX_PATTERNS = {
        "WI_PROV_FILE": "icd_d06",
        "WI_FSIA_FILE": "icd_d12",
    }

    # Check prefix patterns first (most reliable)
    upper_filename = base_filename.upper()
    for prefix, iface_type in PREFIX_PATTERNS.items():
        if upper_filename.startswith(prefix.upper()):
            plugin = get_interface(iface_type)
            return {
                "interface_type": iface_type,
                "display_name": plugin.display_name,
                "match_method": "filename_prefix",
            }

    # Fall back to extension matching
    _, ext = os.path.splitext(base_filename.lower())
    if ext:
        for plugin in list_interfaces():
            if ext in plugin.file_extensions:
                # Only use extension match if this extension is unique to one plugin
                matching_plugins = [p for p in list_interfaces() if ext in p.file_extensions]
                if len(matching_plugins) == 1:
                    return {
                        "interface_type": plugin.interface_type,
                        "display_name": plugin.display_name,
                        "match_method": "file_extension",
                    }

    return {"interface_type": None, "display_name": None, "match_method": None}


def get_parsed_file(filename: str) -> BaseParsedFile:
    """Retrieve a cached parsed file (used internally)."""
    if filename not in _parsed_files:
        raise HTTPException(status_code=404, detail=f"File '{filename}' not cached.")
    return _parsed_files[filename]
