"""
Shared sidebar for the pl-test Streamlit application.

Provides page_setup() which every page (including app.py) should call as early
as possible. It sets the page config, checks auth, and renders the sidebar.

Entity ID Prefix is persisted to browser localStorage.
"""
import streamlit as st
from src.web.local_storage import load_entity_prefix_from_browser, save_entity_prefix_to_browser


def page_setup():
    """Call at the top of every page to set page config, check auth, and render sidebar."""
    st.set_page_config(
        page_title="Pipeline Verification Tool",
        page_icon="\U0001f50d",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    from src.web.auth import check_auth
    if not check_auth():
        st.stop()

    render_sidebar()

    # API health status
    try:
        from src.web.api_client import api_get
        health = api_get("/health")
        if health and health.get("status") == "healthy":
            st.sidebar.success("API Connected")
        else:
            st.sidebar.error("API Unhealthy")
    except Exception as e:
        st.sidebar.error(f"API Offline: {e}")


def render_sidebar():
    """Render the sidebar content (QA Settings)."""
    # Load from browser localStorage on first session visit
    load_entity_prefix_from_browser()

    # Initialize default
    if "entity_id_prefix" not in st.session_state:
        st.session_state["entity_id_prefix"] = "000000000"

    # QA Settings
    st.sidebar.subheader("QA Settings")
    entity_id_prefix = st.sidebar.text_input(
        "Entity ID Prefix",
        value=st.session_state.get("entity_id_prefix", "000000000"),
        help="Your unique test data prefix. Saved in your browser across sessions.",
    )

    # Sync changes and persist to browser
    if entity_id_prefix != st.session_state.get("entity_id_prefix"):
        st.session_state["entity_id_prefix"] = entity_id_prefix

    save_entity_prefix_to_browser(st.session_state["entity_id_prefix"])

    st.sidebar.caption(f"Active prefix: `{st.session_state['entity_id_prefix']}`")
    st.sidebar.divider()
