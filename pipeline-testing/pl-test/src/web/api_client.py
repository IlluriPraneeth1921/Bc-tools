"""
HTTP client for communicating with the FastAPI backend.
Streamlit calls the API via HTTP (Option A architecture).
"""
import os
import requests
from typing import Optional, Dict, Any, Tuple


def get_api_base_url() -> str:
    """Get the FastAPI backend URL from environment or default."""
    return os.getenv("PL_TEST_API_URL", "http://localhost:8000")


def _make_request(method: str, path: str, **kwargs) -> Tuple[Optional[Dict], Optional[str]]:
    """Internal helper that returns (data, error_message)."""
    url = f"{get_api_base_url()}{path}"
    timeout = kwargs.pop("timeout", 30)
    try:
        resp = requests.request(method, url, timeout=timeout, **kwargs)
        if resp.status_code >= 400:
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:
                detail = resp.text
            return None, f"API error {resp.status_code}: {detail}"
        return resp.json(), None
    except requests.ConnectionError:
        return None, "Cannot connect to API. Ensure the FastAPI backend is running."
    except requests.Timeout:
        return None, "API request timed out."
    except requests.RequestException as e:
        return None, f"API request failed: {str(e)}"


def api_get(path: str, params: Dict[str, Any] = None) -> Optional[Dict]:
    """Make a GET request to the FastAPI backend. Returns data or None."""
    data, error = _make_request("GET", path, params=params)
    if error:
        # Store error in a way pages can access it
        _set_last_error(error)
    return data


def api_post(path: str, json_data: Dict[str, Any] = None, files=None) -> Optional[Dict]:
    """Make a POST request to the FastAPI backend."""
    kwargs = {"timeout": 120}
    if files:
        kwargs["files"] = files
    else:
        kwargs["json"] = json_data
    data, error = _make_request("POST", path, **kwargs)
    if error:
        _set_last_error(error)
    return data


def api_delete(path: str) -> Optional[Dict]:
    """Make a DELETE request to the FastAPI backend."""
    data, error = _make_request("DELETE", path)
    if error:
        _set_last_error(error)
    return data


def get_last_error() -> Optional[str]:
    """Get the last API error message."""
    return _last_error


def _set_last_error(msg: str):
    global _last_error
    _last_error = msg


_last_error: Optional[str] = None
