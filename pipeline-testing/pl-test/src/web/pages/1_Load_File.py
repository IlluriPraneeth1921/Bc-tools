"""
Page: Load File
Select a test file from S3 or upload one (which also goes to S3).
Interface type is inferred automatically from the filename.

Optimized for large file lists with search, filtering, and caching.
"""
import streamlit as st
import pandas as pd
from src.web.sidebar import page_setup
from src.web.api_client import api_get, api_post, get_last_error

page_setup()

st.markdown("### Load Test File")


def _infer_interface(filename: str):
    """Call the API to infer interface type from filename."""
    result = api_get("/api/files/infer-interface", params={"filename": filename})
    if result and result.get("interface_type"):
        return result["interface_type"], result["display_name"]
    return None, None


def _fetch_s3_files():
    """Fetch S3 file list and cache in session state."""
    with st.spinner("Loading file list from S3..."):
        s3_result = api_get("/api/files/s3-list")
    if s3_result and s3_result.get("files"):
        # Filter out directory markers (entries ending with /)
        files = [f for f in s3_result["files"] if not f.endswith("/")]
        st.session_state["s3_files_all"] = files
    else:
        st.session_state["s3_files_all"] = []


# --- Two columns: Select from S3 | Upload new file ---
col_select, col_upload = st.columns([3, 2])

with col_select:
    st.markdown("**Select from S3**")

    # Controls row: Refresh + Search
    ctrl_col1, ctrl_col2 = st.columns([1, 3])
    with ctrl_col1:
        if st.button("Refresh", key="refresh_s3"):
            st.session_state.pop("s3_files_all", None)
            with st.spinner("Refreshing..."):
                s3_result = api_get("/api/files/s3-list", params={"refresh": "true"})
            if s3_result and s3_result.get("files"):
                files = [f for f in s3_result["files"] if not f.endswith("/")]
                st.session_state["s3_files_all"] = files
            else:
                st.session_state["s3_files_all"] = []
    with ctrl_col2:
        search_term = st.text_input(
            "Search files",
            placeholder="Type to filter...",
            label_visibility="collapsed",
            key="file_search",
        )

    # Lazy load: only fetch if user hasn't loaded yet
    if "s3_files_all" not in st.session_state:
        _fetch_s3_files()

    s3_files = st.session_state.get("s3_files_all", [])

    # Apply search filter
    if search_term:
        filtered_files = [f for f in s3_files if search_term.lower() in f.lower()]
    else:
        filtered_files = s3_files

    if filtered_files:
        # Group by interface type prefix for cleaner display
        display_names = []
        for f in filtered_files:
            # Show just the filename part, with interface type as a subtle prefix
            if "/" in f:
                parts = f.split("/", 1)
                display_names.append(f"{parts[1]}  ({parts[0]})")
            else:
                display_names.append(f)

        # Use selectbox for large lists, radio for small
        current_selection = st.session_state.get("selected_s3_file_idx", 0)
        if current_selection >= len(filtered_files):
            current_selection = 0

        selected_idx = st.selectbox(
            "Choose a file",
            range(len(filtered_files)),
            index=current_selection,
            format_func=lambda i: display_names[i],
            key="s3_file_select",
        )

        selected_file = filtered_files[selected_idx]

        st.caption(f"Showing {len(filtered_files)} of {len(s3_files)} files")

        if st.button("Load Selected File", type="primary"):
            # Infer interface type from filename
            # S3 list returns paths like "icd_d06/WI_PROV_FILE.psv" — extract just the filename
            if "/" in selected_file:
                s3_interface_prefix = selected_file.split("/")[0]
                bare_filename = selected_file[len(s3_interface_prefix) + 1:]
            else:
                s3_interface_prefix = None
                bare_filename = selected_file

            inferred_type, inferred_name = _infer_interface(bare_filename)

            # If inference fails on bare filename, try the full path
            if inferred_type is None and s3_interface_prefix:
                inferred_type, inferred_name = _infer_interface(selected_file)

            if inferred_type is None:
                st.error(
                    f"**Unknown file type:** Cannot determine the interface type for `{selected_file}`. "
                    f"The filename does not match any registered interface pattern."
                )
            else:
                st.caption(f"Detected: **{inferred_name}**")
                with st.spinner(f"Loading {bare_filename}..."):
                    result = api_post(
                        f"/api/files/s3-load?filename={bare_filename}&interface_type={inferred_type}"
                    )
                if result:
                    st.session_state["selected_filename"] = result["filename"]
                    st.session_state["selected_interface_type"] = inferred_type
                    st.session_state["selected_interface_name"] = inferred_name
                    st.session_state["last_parse_result"] = result
                    st.rerun()
                else:
                    st.error(get_last_error() or "Failed to load file from S3.")

    elif s3_files:
        st.info(f"No files match '{search_term}'. Clear the search to see all {len(s3_files)} files.")
    else:
        st.info("No test files found in S3 bucket. Click **Refresh** or upload a file.")

with col_upload:
    st.markdown("**Upload New File**")
    st.caption("Uploads to S3 and loads it.")

    uploaded_file = st.file_uploader("Choose a test file", type=["psv", "txt", "csv", "xml"])

    if uploaded_file is not None:
        if st.button("Upload & Load", type="primary"):
            # Infer interface type from uploaded filename
            inferred_type, inferred_name = _infer_interface(uploaded_file.name)

            if inferred_type is None:
                st.error(
                    f"**Unknown file type:** Cannot determine the interface type for `{uploaded_file.name}`. "
                    f"The filename does not match any registered interface pattern. "
                    f"Please ensure the file is named correctly (e.g., WI_PROV_FILE_*.psv or WI_FSIA_FILE_*.txt)."
                )
            else:
                st.caption(f"Detected: **{inferred_name}**")
                with st.spinner(f"Uploading {uploaded_file.name} to S3..."):
                    files = {"file": (uploaded_file.name, uploaded_file.getvalue(), "text/plain")}
                    result = api_post(
                        f"/api/files/s3-upload?interface_type={inferred_type}",
                        files=files,
                    )

                if result:
                    st.session_state["selected_filename"] = result["filename"]
                    st.session_state["selected_interface_type"] = inferred_type
                    st.session_state["selected_interface_name"] = inferred_name
                    st.session_state["last_parse_result"] = result
                    st.session_state.pop("s3_files_all", None)  # Invalidate cache
                    st.rerun()
                else:
                    st.error(get_last_error() or "Failed to upload file.")

# --- Display Parse Results ---
if "last_parse_result" in st.session_state:
    result = st.session_state["last_parse_result"]

    st.divider()
    st.markdown(f"**Loaded:** {result['filename']}")

    interface_name = st.session_state.get("selected_interface_name", "")
    if interface_name:
        st.caption(f"Interface: {interface_name}")

    col1, col2, col3 = st.columns(3)
    col1.metric("Entities", result["total_providers"])
    col2.metric("Total Records", result["record_count"])
    col3.metric("Source Lines", result["total_lines"])

    st.markdown("**Entities**")
    provider_data = result.get("provider_names", [])
    if provider_data:
        df = pd.DataFrame(provider_data)
        df.columns = ["Entity ID", "Name"]
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.dataframe({"Entity ID": result["provider_ids"]}, use_container_width=True)

    # --- Prefix mismatch warning ---
    user_prefix = st.session_state.get("entity_id_prefix", "000000000")
    entity_ids = result.get("provider_ids", [])
    if user_prefix and entity_ids:
        matching_ids = [eid for eid in entity_ids if eid.startswith(user_prefix)]
        if not matching_ids:
            st.warning(
                f"**Prefix mismatch:** None of the {len(entity_ids)} entities in this file "
                f"start with your Entity ID Prefix `{user_prefix}`. "
                f"The comparison will find no matching data and report everything as missing.\n\n"
                f"Either change your prefix in the sidebar or load a file that contains entities "
                f"matching your prefix."
            )
        elif len(matching_ids) < len(entity_ids):
            st.info(
                f"**Partial match:** {len(matching_ids)} of {len(entity_ids)} entities match "
                f"your prefix `{user_prefix}`. Only matching entities will be compared."
            )

    st.markdown("**Record Types Found**")
    st.write(", ".join(result["record_types_found"]))

    st.info("Go to the **Compare** page to run verification.")
