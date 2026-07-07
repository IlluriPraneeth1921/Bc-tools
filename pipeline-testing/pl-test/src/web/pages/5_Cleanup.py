"""
Page: Cleanup
Two sections:
1. Delete test run verification data (our tracking tables)
2. Reset pipeline databases (remove actual pipeline-inserted test data)
"""
import streamlit as st
from src.web.sidebar import page_setup
from src.web.api_client import api_get, api_post, api_delete, get_last_error

page_setup()

st.title("Cleanup")

# =============================================================================
# Section 1: Test Run Management
# =============================================================================
st.header("Test Run History")
st.markdown("Delete verification tracking data (mismatch reports, expected state) for past test runs.")

runs = api_get("/api/test-runs/", params={"limit": 20})

if runs is None:
    st.error(get_last_error() or "Failed to connect to API.")
elif not runs:
    st.info("No test runs found.")
else:
    run_options = []
    run_map = {}
    for run in runs:
        status_icon = {"PASS": "✅", "FAIL": "❌", "PARTIAL": "⚠️", "PENDING": "⏳", "RUNNING": "🔄"}.get(run["overall_status"], "❓")
        timestamp = run["start_timestamp"][:16] if run["start_timestamp"] else ""
        label = f"{status_icon} {run['source_filename']} — {run['overall_status']} ({timestamp})"
        run_options.append(label)
        run_map[label] = run

    selected_label = st.selectbox("Select Test Run", run_options)
    selected_run = run_map[selected_label]
    test_run_id = selected_run["test_run_id"]

    col1, col2, col3 = st.columns(3)
    col1.metric("Status", selected_run["overall_status"])
    col2.metric("Entities", selected_run.get("total_providers") or "N/A")
    col3.metric("Source Lines", selected_run.get("total_source_lines") or "N/A")

    if st.button("Delete Test Run", type="secondary"):
        result = api_delete(f"/api/cleanup/{test_run_id}")
        if result:
            st.success(result["message"])
            st.rerun()
        else:
            st.error(get_last_error() or "Delete failed.")

# =============================================================================
# Section 2: Pipeline Data Reset
# =============================================================================
st.divider()
st.header("Pipeline Data Reset")
st.markdown(
    "Remove **actual pipeline-inserted data** from the staging and Carity databases. "
    "This deletes rows the pipeline wrote for test entities matching your prefix. "
    "Use this to restore databases to a pristine state before re-running tests."
)

st.warning(
    "These operations delete real data from the pipeline databases. "
    "Only use with your test entity ID prefix.",
    icon="⚠️",
)

entity_prefix = st.text_input(
    "Entity ID Prefix",
    value=st.session_state.get("entity_id_prefix", "000000000"),
    help="Only entities whose ID starts with this prefix will be deleted.",
)

# Interface type selection for pipeline cleanup
if "available_interfaces" not in st.session_state:
    ifaces = api_get("/api/files/interfaces")
    if ifaces and ifaces.get("interfaces"):
        st.session_state["available_interfaces"] = ifaces["interfaces"]
    else:
        st.session_state["available_interfaces"] = []

interfaces = st.session_state.get("available_interfaces", [])
interface_options = {"": "All Interfaces"} | {i["interface_type"]: i["display_name"] for i in interfaces}
selected_cleanup_interface = st.selectbox(
    "Interface Type",
    options=list(interface_options.keys()),
    format_func=lambda x: interface_options[x],
    key="cleanup_interface_type",
)

col_a, col_b, col_c, col_d = st.columns(4)

with col_a:
    st.markdown("**Test Interface Data**")
    st.caption("TestVerification schema (expected states, mismatches, test runs)")
    if st.button("Clear Test Expectation Data", type="primary", key="clear_test_data"):
        with st.spinner("Cleaning TestVerification data..."):
            result = api_post("/api/cleanup/test-data/all", json_data={})
        if result:
            st.success(result["message"])
        else:
            st.error(get_last_error() or "Cleanup failed.")

with col_b:
    st.markdown("**Stages 1-3**")
    st.caption("Raw + Parsed + Incoming (Interface DB)")
    if st.button("Clear Interface DB", type="primary", key="clear_interface"):
        with st.spinner("Cleaning Stages 1-3..."):
            result = api_post("/api/cleanup/pipeline/interface", json_data={
                "entity_id_prefix": entity_prefix,
                "interface_type": selected_cleanup_interface or None,
            })
        if result:
            st.success(result["message"])
        else:
            st.error(get_last_error() or "Cleanup failed.")

with col_c:
    st.markdown("**Stage 4**")
    st.caption("Final Carity DB")
    if st.button("Clear Carity DB", type="primary", key="clear_carity"):
        with st.spinner("Cleaning Stage 4..."):
            result = api_post("/api/cleanup/pipeline/carity", json_data={
                "entity_id_prefix": entity_prefix,
                "interface_type": selected_cleanup_interface or None,
            })
        if result:
            st.success(result["message"])
        else:
            st.error(get_last_error() or "Cleanup failed.")

with col_d:
    st.markdown("**All Stages**")
    st.caption("Full reset: Stages 1-4 across both DBs")
    if st.button("Clear Everything", type="primary", key="clear_all"):
        with st.spinner("Cleaning all 4 stages..."):
            result = api_post("/api/cleanup/pipeline/all", json_data={
                "entity_id_prefix": entity_prefix,
                "interface_type": selected_cleanup_interface or None,
            })
        if result:
            st.success(result["message"])
        else:
            st.error(get_last_error() or "Cleanup failed.")
