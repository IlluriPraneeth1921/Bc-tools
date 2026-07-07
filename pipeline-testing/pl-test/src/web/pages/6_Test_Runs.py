"""
Page: Test Runs
View all test run history, organized by file name.
"""
import streamlit as st
import pandas as pd
from src.web.sidebar import page_setup
from src.web.api_client import api_get, get_last_error

page_setup()

st.title("Test Run History")

# Filters
col1, col2 = st.columns(2)
with col1:
    interface_filter = st.selectbox("Interface Type", [None, "icd_d06"], format_func=lambda x: "All" if x is None else x)
with col2:
    limit = st.number_input("Show last N runs", min_value=5, max_value=100, value=20)

# Fetch
params = {"limit": limit}
if interface_filter:
    params["interface_type"] = interface_filter

runs = api_get("/api/test-runs/", params=params)

if runs is None:
    st.error(get_last_error() or "Failed to connect to API.")
    st.stop()

if not runs:
    st.info("No test runs found.")
    st.stop()

# Convert to DataFrame
df = pd.DataFrame(runs)

# Add computed columns
df["total_pass"] = df["stage1_pass_count"] + df["stage2_pass_count"] + df["stage3_pass_count"] + df["stage4_pass_count"]
df["total_fail"] = df["stage1_fail_count"] + df["stage2_fail_count"] + df["stage3_fail_count"] + df["stage4_fail_count"]

# Display
display_cols = ["overall_status", "source_filename", "interface_type", "total_providers", "total_pass", "total_fail", "start_timestamp", "cleaned_up"]
available = [c for c in display_cols if c in df.columns]

st.dataframe(
    df[available],
    use_container_width=True,
    hide_index=True,
    column_config={
        "overall_status": st.column_config.TextColumn("Status", width="small"),
        "source_filename": st.column_config.TextColumn("File"),
        "total_pass": st.column_config.NumberColumn("Pass", width="small"),
        "total_fail": st.column_config.NumberColumn("Fail", width="small"),
        "start_timestamp": st.column_config.TextColumn("Started"),
        "cleaned_up": st.column_config.CheckboxColumn("Cleaned"),
    },
)

# Export
csv = df[available].to_csv(index=False)
st.download_button(
    label="Export to CSV",
    data=csv,
    file_name="test_run_history.csv",
    mime="text/csv",
)

# Click to see details via expander
st.subheader("Run Details")
for run in runs:
    status_icon = {"PASS": "✅", "FAIL": "❌", "PARTIAL": "⚠️", "PENDING": "⏳", "RUNNING": "🔄"}.get(run["overall_status"], "❓")
    timestamp = run["start_timestamp"][:16] if run["start_timestamp"] else ""
    with st.expander(f"{status_icon} {run['source_filename']} — {run['overall_status']} ({timestamp})"):
        col1, col2 = st.columns(2)
        col1.write(f"**Interface:** {run['interface_type']}")
        col2.write(f"**Prefix:** {run['mcd_id_prefix']}")

        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Stage 1", f"{run['stage1_pass_count']}✓ / {run['stage1_fail_count']}✗")
        col2.metric("Stage 2", f"{run['stage2_pass_count']}✓ / {run['stage2_fail_count']}✗")
        col3.metric("Stage 3", f"{run['stage3_pass_count']}✓ / {run['stage3_fail_count']}✗")
        col4.metric("Stage 4", f"{run['stage4_pass_count']}✓ / {run['stage4_fail_count']}✗")

        st.caption(f"Run ID: `{run['test_run_id']}`")

        # Export mismatches for this run
        export_name = run["source_filename"].replace(".psv", "")
        mismatch_result = api_get(f"/api/compare/mismatches/{run['test_run_id']}", params={"limit": 10000})
        if mismatch_result and mismatch_result.get("count", 0) > 0:
            mismatch_df = pd.DataFrame(mismatch_result["mismatches"])
            csv = mismatch_df.to_csv(index=False)
            st.download_button(
                label=f"Export Mismatches ({mismatch_result['count']} records)",
                data=csv,
                file_name=f"mismatches_{export_name}.csv",
                mime="text/csv",
                key=f"export_{run['test_run_id']}",
            )
        elif mismatch_result and mismatch_result.get("count", 0) == 0:
            st.caption("No mismatches to export.")
