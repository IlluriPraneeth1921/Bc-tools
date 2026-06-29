"""
Page: Compare
Trigger comparison against all 4 pipeline stages and show results.
Uses the file loaded on the Load File page (session state).
Supports multiple interface types via the plugin registry.

Shows real-time progress as each stage completes.
"""
import uuid
import streamlit as st
from src.web.sidebar import page_setup
from src.web.api_client import api_get, api_post, get_last_error

page_setup()

STAGE_NAMES = {
    1: "Stage 1 — Raw",
    2: "Stage 2 — Parsed",
    3: "Stage 3 — Transformed",
    4: "Stage 4 — Final Carity",
}

st.title("Run Comparison")
st.markdown("Compare expected state against actual database state across all 4 pipeline stages.")

# --- File Selection (from session state) ---
selected_file = st.session_state.get("selected_filename")

if not selected_file:
    st.warning("No file loaded. Go to the **Load File** page first to select a test file.")
    st.stop()

st.info(f"**File:** {selected_file}")

# --- Entity ID Prefix from session (set in sidebar) ---
mcd_id_prefix = st.session_state.get("entity_id_prefix", "000000000")
if not mcd_id_prefix:
    st.warning("**Entity ID Prefix** not set. Please set it in the left sidebar on the app home page.")
    st.stop()

# --- Configuration ---
st.subheader("Configuration")

# Interface type is read-only — determined by the loaded file
interface_type = st.session_state.get("selected_interface_type", "icd_d06")
interface_name = st.session_state.get("selected_interface_name", "")

if interface_name:
    st.markdown(f"**Interface Type:** {interface_name}")
else:
    st.markdown(f"**Interface Type:** `{interface_type}`")

st.caption(f"Using Entity ID Prefix: **{mcd_id_prefix}** (change in sidebar)")

st.markdown("**Stages to Verify**")
stage_options = {
    1: "Stage 1 — Raw",
    2: "Stage 2 — Parsed",
    3: "Stage 3 — Transformed",
    4: "Stage 4 — Final Carity",
}
selected_stages = []
for stage_num, stage_label in stage_options.items():
    if st.checkbox(stage_label, value=True, key=f"stage_{stage_num}"):
        selected_stages.append(stage_num)


# --- Helper function (must be defined before use) ---
def _display_results(result):
    """Display comparison results with status indicators."""
    status = result["status"]
    if status == "PASS":
        st.success("**PASS** — All checks passed!")
    elif status == "FAIL":
        st.error("**FAIL** — Mismatches found.")
    else:
        st.warning("**PARTIAL** — Some checks passed, some failed.")

    # Summary metrics
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Checks", result["total_checks"])
    col2.metric("Pass", result["total_pass"])
    col3.metric("Fail", result["total_fail"])
    col4.metric("Missing", result["total_missing"])

    # Per-stage breakdown
    st.subheader("Stage Results")
    for stage_data in result["stages"]:
        stage_num = stage_data["stage"]
        stage_name = STAGE_NAMES.get(stage_num, f"Stage {stage_num}")

        total = stage_data["total_checks"]
        passed = stage_data["pass_count"]
        failed = stage_data["fail_count"] + stage_data["missing_count"]

        if failed == 0 and total > 0:
            st.success(f"**{stage_name}:** {passed}/{total} checks passed")
        elif total == 0:
            st.info(f"**{stage_name}:** No data found")
        else:
            st.error(f"**{stage_name}:** {failed} issues ({passed} passed, {stage_data['fail_count']} failed, {stage_data['missing_count']} missing)")

    st.divider()
    st.info(f"Test Run ID: `{result['test_run_id']}`\n\nExpected state persisted to database. Go to **Mismatches** page for details.")


# --- Execute ---
st.subheader("Execute")
if st.button("Run Comparison", type="primary"):
    if not selected_stages:
        st.error("Select at least one stage to verify.")
        st.stop()

    total_stages = len(selected_stages)
    test_run_id = str(uuid.uuid4())

    # Create the TestRun record first
    init_result = api_post("/api/test-runs/create", json_data={
        "test_run_id": test_run_id,
        "interface_type": interface_type,
        "filepath": selected_file,
        "mcd_id_prefix": mcd_id_prefix,
    })

    # If the create endpoint doesn't exist, fall back to the full /run endpoint
    # with progress shown via stage-by-stage calls
    use_stage_api = True

    # Progress UI elements
    progress_bar = st.progress(0, text="Initializing comparison...")
    stage_status_container = st.container()

    stage_results = []
    all_passed = True
    has_error = False

    for idx, stage_num in enumerate(selected_stages):
        stage_name = STAGE_NAMES.get(stage_num, f"Stage {stage_num}")
        progress_pct = idx / total_stages
        progress_bar.progress(progress_pct, text=f"Running {stage_name}...")

        with stage_status_container:
            st.caption(f"Processing {stage_name}: generating expected state, persisting, comparing...")

        # Call per-stage endpoint
        stage_result = api_post("/api/compare/run-stage", json_data={
            "test_run_id": test_run_id,
            "filepath": selected_file,
            "interface_type": interface_type,
            "mcd_id_prefix": mcd_id_prefix,
            "stage": stage_num,
        })

        if stage_result is None:
            # If per-stage endpoint doesn't exist, fall back to full run
            error_msg = get_last_error() or ""
            if "404" in error_msg or "Not Found" in error_msg:
                use_stage_api = False
                break
            else:
                has_error = True
                with stage_status_container:
                    st.error(f"**{stage_name}:** Failed — {error_msg}")
                break

        stage_results.append(stage_result)

        # Show inline result for this stage
        failed = stage_result["fail_count"] + stage_result["missing_count"]
        passed = stage_result["pass_count"]
        total = stage_result["total_checks"]
        stored = stage_result["expected_rows_stored"]

        if failed > 0:
            all_passed = False

    # Fallback: use the full /run endpoint if per-stage isn't available
    if not use_stage_api:
        progress_bar.progress(0.2, text="Running full comparison...")
        result = api_post("/api/compare/run", json_data={
            "filepath": selected_file,
            "interface_type": interface_type,
            "mcd_id_prefix": mcd_id_prefix,
            "stages": selected_stages,
        })
        progress_bar.progress(1.0, text="Comparison complete!")

        if result:
            st.session_state["last_compare_result"] = result
            st.session_state["last_test_run_id"] = result["test_run_id"]
            _display_results(result)
        else:
            st.error(get_last_error() or "Comparison failed.")
        st.stop()

    if has_error:
        progress_bar.progress(1.0, text="Comparison stopped due to error.")
        st.stop()

    # All stages done — update progress bar
    progress_bar.progress(1.0, text="Comparison complete!")

    # Update TestRun with final results
    total_pass = sum(s["pass_count"] for s in stage_results)
    total_fail = sum(s["fail_count"] for s in stage_results)
    total_missing = sum(s["missing_count"] for s in stage_results)
    total_checks = sum(s["total_checks"] for s in stage_results)
    overall_status = "PASS" if total_fail == 0 and total_missing == 0 else "FAIL" if total_pass == 0 else "PARTIAL"

    # Finalize the test run
    api_post("/api/test-runs/finalize", json_data={
        "test_run_id": test_run_id,
        "overall_status": overall_status,
        "stage_results": stage_results,
    })

    # Build a CompareResponse-like dict for display
    combined_result = {
        "test_run_id": test_run_id,
        "filename": selected_file,
        "status": overall_status,
        "total_providers": 0,
        "total_source_lines": 0,
        "stages": [
            {
                "stage": s["stage"],
                "total_checks": s["total_checks"],
                "pass_count": s["pass_count"],
                "fail_count": s["fail_count"],
                "missing_count": s["missing_count"],
            }
            for s in stage_results
        ],
        "total_checks": total_checks,
        "total_pass": total_pass,
        "total_fail": total_fail,
        "total_missing": total_missing,
    }

    st.session_state["last_compare_result"] = combined_result
    st.session_state["last_test_run_id"] = test_run_id

    # Display results
    _display_results(combined_result)
