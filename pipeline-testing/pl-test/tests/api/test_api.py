"""
Tests for FastAPI endpoints.
Tests that don't require DB use httpx TestClient with mocked responses.
"""
import os
import sys
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

# Path to test data files
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# data/ is one level above pl-test/ (at workspace root)
_WORKSPACE_ROOT = os.path.dirname(_PROJECT_ROOT)
DATA_DIR = os.path.join(_WORKSPACE_ROOT, "data", "icd_d06")
BASELINE_FILE = os.path.join(DATA_DIR, "WI_PROV_FILE_EXTRACT_T.psv")
D12_DATA_DIR = os.path.join(_WORKSPACE_ROOT, "data", "icd_d12")
D12_BASELINE_FILE = os.path.join(D12_DATA_DIR, "WI_FSIA_FILE_EXTRACT_T.txt")


class TestHealthEndpoints:
    """Test health and root endpoints (no DB needed)."""

    def test_root_returns_service_info(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "pl-test"
        assert data["version"] == "0.1.0"
        assert data["status"] == "running"

    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestFileEndpoints:
    """Test file upload/parse endpoints."""

    def test_parse_local_file_not_found(self):
        response = client.post(
            "/api/files/parse-local",
            params={"filepath": "/nonexistent/file.psv"},
        )
        assert response.status_code == 404

    def test_parse_local_file_success(self):
        response = client.post(
            "/api/files/parse-local",
            params={"filepath": BASELINE_FILE},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_providers"] == 3
        assert data["record_count"] == 49
        assert "000000000012345" in data["provider_ids"]
        assert "00" in data["record_types_found"]
        assert "01" in data["record_types_found"]

    def test_upload_psv_file(self):
        with open(BASELINE_FILE, "rb") as f:
            response = client.post(
                "/api/files/upload",
                files={"file": ("WI_PROV_FILE_EXTRACT_T.psv", f, "text/plain")},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["total_providers"] == 3
        assert data["filename"] == "WI_PROV_FILE_EXTRACT_T.psv"

    def test_upload_d12_file(self):
        if not os.path.exists(D12_BASELINE_FILE):
            pytest.skip("D12 baseline file not available")
        with open(D12_BASELINE_FILE, "rb") as f:
            response = client.post(
                "/api/files/upload",
                params={"interface_type": "icd_d12"},
                files={"file": ("WI_FSIA_FILE_EXTRACT_T.txt", f, "text/plain")},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["total_providers"] == 3

    def test_list_cached_files(self):
        # After uploading, the file should be in cache
        response = client.get("/api/files/cached")
        assert response.status_code == 200

    def test_list_interfaces(self):
        response = client.get("/api/files/interfaces")
        assert response.status_code == 200
        data = response.json()
        assert "interfaces" in data
        types = [i["interface_type"] for i in data["interfaces"]]
        assert "icd_d06" in types
        assert "icd_d12" in types
        # Each interface should have file_extensions
        for iface in data["interfaces"]:
            assert "file_extensions" in iface
            assert "display_name" in iface


class TestInferInterfaceEndpoint:
    """Test the interface type inference endpoint."""

    def test_infer_d06_from_prov_filename(self):
        response = client.get(
            "/api/files/infer-interface",
            params={"filename": "WI_PROV_FILE_EXTRACT_T.psv"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["interface_type"] == "icd_d06"
        assert data["match_method"] == "filename_prefix"

    def test_infer_d06_from_prov_filename_with_suffix(self):
        response = client.get(
            "/api/files/infer-interface",
            params={"filename": "WI_PROV_FILE_EXTRACT_T_08_LARGE_VOLUME.psv"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["interface_type"] == "icd_d06"

    def test_infer_d12_from_fsia_filename(self):
        response = client.get(
            "/api/files/infer-interface",
            params={"filename": "WI_FSIA_FILE_EXTRACT_T.txt"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["interface_type"] == "icd_d12"
        assert data["match_method"] == "filename_prefix"

    def test_infer_d12_from_fsia_update_filename(self):
        response = client.get(
            "/api/files/infer-interface",
            params={"filename": "WI_FSIA_FILE_EXTRACT_T_UPD01_ADL_CHANGES.txt"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["interface_type"] == "icd_d12"

    def test_infer_handles_path_prefix(self):
        """Filenames from S3 listings may include directory prefixes."""
        response = client.get(
            "/api/files/infer-interface",
            params={"filename": "icd_d06/WI_PROV_FILE_EXTRACT_T.psv"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["interface_type"] == "icd_d06"

    def test_infer_unknown_filename_returns_null(self):
        response = client.get(
            "/api/files/infer-interface",
            params={"filename": "random_data_file.csv"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["interface_type"] is None
        assert data["match_method"] is None

    def test_infer_case_insensitive(self):
        response = client.get(
            "/api/files/infer-interface",
            params={"filename": "wi_prov_file_extract_t.PSV"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["interface_type"] == "icd_d06"

    def test_infer_psv_extension_unique_to_d06(self):
        """PSV extension is unique to icd_d06 — should match by extension."""
        response = client.get(
            "/api/files/infer-interface",
            params={"filename": "custom_name.psv"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["interface_type"] == "icd_d06"
        assert data["match_method"] == "file_extension"


class TestS3ListEndpoint:
    """Test S3 file listing with caching."""

    @patch("src.api.files.list_test_files")
    def test_s3_list_returns_files(self, mock_list):
        mock_list.return_value = ["WI_PROV_FILE_EXTRACT_T.psv", "WI_PROV_FILE_EXTRACT_T_02.psv"]
        response = client.get("/api/files/s3-list")
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        assert len(data["files"]) == 2

    @patch("src.api.files.list_test_files")
    def test_s3_list_with_interface_filter(self, mock_list):
        mock_list.return_value = ["WI_FSIA_FILE_EXTRACT_T.txt"]
        response = client.get("/api/files/s3-list", params={"interface_type": "icd_d12"})
        assert response.status_code == 200
        mock_list.assert_called_with(interface_type="icd_d12")

    @patch("src.api.files.list_test_files")
    def test_s3_list_caches_result(self, mock_list):
        mock_list.return_value = ["file1.psv", "file2.psv"]

        # First call — fetches from S3
        response1 = client.get("/api/files/s3-list", params={"refresh": "true"})
        assert response1.status_code == 200
        assert response1.json()["cached"] is False

        # Second call — should use cache
        response2 = client.get("/api/files/s3-list")
        assert response2.status_code == 200
        assert response2.json()["cached"] is True

    @patch("src.api.files.list_test_files")
    def test_s3_list_refresh_bypasses_cache(self, mock_list):
        mock_list.return_value = ["file1.psv"]
        # Populate cache
        client.get("/api/files/s3-list", params={"refresh": "true"})

        mock_list.return_value = ["file1.psv", "new_file.psv"]
        # Refresh should get fresh results
        response = client.get("/api/files/s3-list", params={"refresh": "true"})
        assert response.status_code == 200
        assert len(response.json()["files"]) == 2
        assert response.json()["cached"] is False

    @patch("src.api.files.list_test_files")
    def test_s3_list_empty_bucket(self, mock_list):
        mock_list.return_value = []
        response = client.get("/api/files/s3-list", params={"refresh": "true"})
        assert response.status_code == 200
        assert response.json()["files"] == []


class TestCompareEndpoints:
    """Test compare endpoints (request validation only — DB calls will fail without schema)."""

    def test_compare_run_file_not_found(self):
        response = client.post(
            "/api/compare/run",
            json={
                "filepath": "/nonexistent/file.psv",
                "interface_type": "icd_d06",
            },
        )
        assert response.status_code == 404

    def test_compare_run_invalid_interface(self):
        response = client.post(
            "/api/compare/run",
            json={
                "filepath": BASELINE_FILE,
                "interface_type": "invalid_type",
            },
        )
        assert response.status_code == 400

    def test_compare_run_stage_file_not_found(self):
        response = client.post(
            "/api/compare/run-stage",
            json={
                "test_run_id": "00000000-0000-0000-0000-000000000001",
                "filepath": "/nonexistent/file.psv",
                "interface_type": "icd_d06",
                "mcd_id_prefix": "000000000",
                "stage": 1,
            },
        )
        assert response.status_code == 404

    def test_compare_run_stage_invalid_interface(self):
        response = client.post(
            "/api/compare/run-stage",
            json={
                "test_run_id": "00000000-0000-0000-0000-000000000001",
                "filepath": BASELINE_FILE,
                "interface_type": "nonexistent",
                "mcd_id_prefix": "000000000",
                "stage": 1,
            },
        )
        assert response.status_code == 400

    def test_compare_run_stage_invalid_stage_number(self):
        """Stage must be 1-4. Stage 5 should return an error."""
        response = client.post(
            "/api/compare/run-stage",
            json={
                "test_run_id": "00000000-0000-0000-0000-000000000001",
                "filepath": BASELINE_FILE,
                "interface_type": "icd_d06",
                "mcd_id_prefix": "000000000",
                "stage": 5,
            },
        )
        # 400 (invalid stage validation) or 404 (file not found in test environment)
        assert response.status_code in (400, 404, 500)

    def test_compare_progress_unknown_run(self):
        response = client.get("/api/compare/progress/nonexistent-id")
        assert response.status_code == 200
        data = response.json()
        assert data["step"] == "unknown"


class TestTestRunEndpoints:
    """Test test-run management endpoints (create, finalize)."""

    @patch("src.api.test_runs.db")
    def test_create_test_run_with_id(self, mock_db):
        mock_db.execute_non_query.return_value = 1
        response = client.post(
            "/api/test-runs/create",
            json={
                "test_run_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "interface_type": "icd_d06",
                "filepath": "icd_d06/WI_PROV_FILE_EXTRACT_T.psv",
                "mcd_id_prefix": "100000000",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["test_run_id"] == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        assert data["status"] == "created"

    @patch("src.api.test_runs.db")
    def test_finalize_test_run(self, mock_db):
        mock_db.execute_non_query.return_value = 1
        response = client.post(
            "/api/test-runs/finalize",
            json={
                "test_run_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "overall_status": "PASS",
                "stage_results": [
                    {"stage": 1, "pass_count": 50, "fail_count": 0, "missing_count": 0},
                    {"stage": 2, "pass_count": 120, "fail_count": 2, "missing_count": 0},
                ],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["test_run_id"] == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        assert data["status"] == "finalized"

    @patch("src.api.test_runs.db")
    def test_finalize_sets_stage_counts(self, mock_db):
        """Verify finalize calls the DB with correct stage pass/fail counts."""
        mock_db.execute_non_query.return_value = 1
        client.post(
            "/api/test-runs/finalize",
            json={
                "test_run_id": "test-run-123",
                "overall_status": "PARTIAL",
                "stage_results": [
                    {"stage": 1, "pass_count": 10, "fail_count": 2, "missing_count": 1},
                    {"stage": 3, "pass_count": 5, "fail_count": 0, "missing_count": 3},
                ],
            },
        )
        # Verify the UPDATE was called
        mock_db.execute_non_query.assert_called_once()
        call_args = mock_db.execute_non_query.call_args
        params = call_args[0][2]  # Third positional arg is the params tuple
        # Stage1Pass=10, Stage1Fail=3, Stage2Pass=0, Stage2Fail=0, Stage3Pass=5, Stage3Fail=3
        assert params[1] == 10   # Stage1PassCount
        assert params[2] == 3    # Stage1FailCount (fail + missing)
        assert params[3] == 0    # Stage2PassCount
        assert params[4] == 0    # Stage2FailCount
        assert params[5] == 5    # Stage3PassCount
        assert params[6] == 3    # Stage3FailCount


class TestOpenAPI:
    """Test that OpenAPI docs are accessible and include new endpoints."""

    def test_openapi_json(self):
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert data["info"]["title"] == "pl-test"
        assert "/api/compare/run" in data["paths"]
        assert "/api/compare/run-stage" in data["paths"]
        assert "/api/compare/progress/{test_run_id}" in data["paths"]
        assert "/api/test-runs/" in data["paths"]
        assert "/api/test-runs/create" in data["paths"]
        assert "/api/test-runs/finalize" in data["paths"]
        assert "/api/files/upload" in data["paths"]
        assert "/api/files/infer-interface" in data["paths"]
        assert "/api/cleanup/{test_run_id}" in data["paths"]
