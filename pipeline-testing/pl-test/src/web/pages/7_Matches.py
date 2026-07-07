"""
Page: Match Report
View detailed match report (records that passed comparison) with filtering and CSV export.
Select from recent test runs (by file name) instead of typing IDs.
This is the inverse of the Mismatch Report — showing records where expected = actual.
"""
import streamlit as st
import pandas as pd
from src.web.sidebar import page_setup
from src.web.api_client import api_get, get_last_error

page_setup()

STAGE_NAMES = {
    1: "Stage 1 — Raw",
    2: "Stage 2 — Parsed",
    3: "Stage 3 — Transformed",
    4: "Stage 4 — Final",
}

st.title("Match Report")

# --- Test Run Selector ---
runs = api_get("/api/test-runs/", params={"limit": 20})

if runs is None:
    st.error(get_last_error() or "Failed to connect to API.")
    st.stop()

if not runs:
    st.info("No test runs found. Run a comparison first on the Compare page.")
    st.stop()

# Build display options: "filename — status (date)"
run_options = []
run_map = {}
for run in runs:
    status_icon = {"PASS": "✅", "FAIL": "❌", "PARTIAL": "⚠️", "PENDING": "⏳", "RUNNING": "🔄"}.get(run["overall_status"], "❓")
    timestamp = run["start_timestamp"][:16] if run["start_timestamp"] else ""
    label = f"{status_icon} {run['source_filename']} — {run['overall_status']} ({timestamp})"
    run_options.append(label)
    run_map[label] = run["test_run_id"]

# Pre-select the most recent run (or the one from session state)
default_idx = 0
last_id = st.session_state.get("last_test_run_id")
if last_id:
    for i, label in enumerate(run_options):
        if run_map[label] == last_id:
            default_idx = i
            break

selected_label = st.selectbox("Select Test Run", run_options, index=default_idx)
test_run_id = run_map[selected_label]

# Summary
st.subheader("Summary by Stage")
summary = api_get(f"/api/compare/summary/{test_run_id}")
if summary and summary.get("mismatch_summary"):
    # Filter summary to only show PASS rows
    all_summary = summary["mismatch_summary"]
    pass_summary = [row for row in all_summary if row.get("Status") == "PASS"]
    if pass_summary:
        summary_df = pd.DataFrame(pass_summary)
        st.dataframe(summary_df, use_container_width=True, hide_index=True)
    else:
        st.info("No pass summary data available.")

# --- Filters ---
st.subheader("Filters")
col1, col2, col3 = st.columns(3)
with col1:
    stage_filter = st.selectbox(
        "Stage", [None, 1, 2, 3, 4],
        format_func=lambda x: "All" if x is None else STAGE_NAMES.get(x, f"Stage {x}"),
    )
with col2:
    provider_filter = st.text_input("Entity ID", value="")
with col3:
    limit = st.number_input("Max rows", min_value=10, max_value=1000, value=100)

# --- Fetch matches ---
params = {"limit": limit}
if stage_filter is not None:
    params["stage"] = stage_filter
if provider_filter:
    params["provider"] = provider_filter

with st.spinner("Loading matches..."):
    result = api_get(f"/api/compare/matches/{test_run_id}", params=params)

if result is None:
    st.error(get_last_error() or "Failed to fetch matches.")
    st.stop()

matches = result.get("matches", [])
count = result.get("count", 0)

st.metric("Matches Found (showing first 100; use `Export All to CSV` for the complete list)", count)

if count == 0:
    st.info("No matches found for the selected filters.")
    st.stop()

# --- Display Results ---
df = pd.DataFrame(matches)

display_cols = [
    "Stage", "EntityId", "TargetTable", "TargetColumn",
    "ExpectedValue", "ActualValue", "Status",
    "BusinessRule", "SourceLineNumber",
]
available_cols = [c for c in display_cols if c in df.columns]
display_df = df[available_cols]

st.subheader("Results")
st.dataframe(
    display_df,
    use_container_width=True,
    column_config={
        "Status": st.column_config.TextColumn(width="small"),
        "Stage": st.column_config.NumberColumn(width="small"),
        "ExpectedValue": st.column_config.TextColumn(width="medium"),
        "ActualValue": st.column_config.TextColumn(width="medium"),
    },
    hide_index=True,
)

# CSV export — fetch ALL matches (not just displayed subset)
st.divider()
selected_run = next((r for r in runs if r["test_run_id"] == test_run_id), {})
export_name = selected_run.get("source_filename", test_run_id[:8]).replace(".psv", "")


def fetch_all_matches():
    """Fetch all matches without limit for export."""
    export_params = {"limit": 10000}
    if stage_filter is not None:
        export_params["stage"] = stage_filter
    if provider_filter:
        export_params["provider"] = provider_filter
    all_result = api_get(f"/api/compare/matches/{test_run_id}", params=export_params)
    if all_result:
        return pd.DataFrame(all_result.get("matches", []))
    return df


export_df = fetch_all_matches()
csv = export_df.to_csv(index=False)
st.download_button(
    label=f"Export All to CSV ({len(export_df)} records)",
    data=csv,
    file_name=f"matches_{export_name}.csv",
    mime="text/csv",
)
