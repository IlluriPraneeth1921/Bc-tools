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

    # Database connection info
    _render_db_status()


def _render_db_status():
    """Fetch and display database connection details in the sidebar."""
    from src.web.api_client import api_get

    st.sidebar.divider()
    st.sidebar.subheader("🗄️ Database Connections")

    db_status = api_get("/api/db-status")
    if not db_status:
        st.sidebar.warning("Could not fetch DB status")
        return

    # Interface DB
    iface = db_status.get("interface_db", {})
    with st.sidebar.container():
        st.sidebar.markdown("**Interface DB**")
        st.sidebar.caption(f"Server: `{iface.get('server', 'N/A')}`")
        st.sidebar.caption(f"Database: `{iface.get('database', 'N/A')}`")
        if iface.get("connected"):
            st.sidebar.markdown("Status: :green[Connected ✓]")
        else:
            st.sidebar.markdown("Status: :red[Disconnected ✗]")
            if iface.get("error"):
                st.sidebar.caption(f"Error: {iface['error']}")

    # Carity DB
    carity = db_status.get("carity_db", {})
    with st.sidebar.container():
        st.sidebar.markdown("**Carity DB**")
        st.sidebar.caption(f"Server: `{carity.get('server', 'N/A')}`")
        st.sidebar.caption(f"Database: `{carity.get('database', 'N/A')}`")
        if carity.get("connected"):
            st.sidebar.markdown("Status: :green[Connected ✓]")
        else:
            st.sidebar.markdown("Status: :red[Disconnected ✗]")
            if carity.get("error"):
                st.sidebar.caption(f"Error: {carity['error']}")


def render_sidebar():
    """Render the sidebar content (QA Settings)."""
    # Load from browser localStorage on first session visit
    load_entity_prefix_from_browser()

    # If we haven't finished loading from localStorage yet (JS redirect pending),
    # show a placeholder and don't render the input or save — avoids overwriting
    # the real stored value with the default.
    if not st.session_state.get("entity_id_prefix_loaded_from_browser"):
        st.sidebar.subheader("QA Settings")
        st.sidebar.info("Loading saved prefix...")
        return

    # Initialize default only after load attempt is complete
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
