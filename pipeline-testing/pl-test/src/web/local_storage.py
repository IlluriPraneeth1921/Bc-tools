"""
Client-side localStorage access for Streamlit.

Provides functions to read/write browser localStorage for the Entity ID Prefix.
Uses st.components.v1.html with a one-time query param redirect to bootstrap
the value from localStorage into Streamlit session state.
"""
import streamlit as st
import streamlit.components.v1 as components

_LS_KEY = "pl_test_entity_id_prefix"


def load_entity_prefix_from_browser():
    """
    Load Entity ID Prefix from browser localStorage on first session visit.

    Injects JS that reads localStorage. If a value exists and this is the first
    load, redirects once with ?_ls_prefix=VALUE so Streamlit can read it.
    Guarded to only fire once per session.
    """
    if "entity_id_prefix_loaded_from_browser" in st.session_state:
        return

    # Check if value came back via query params (from the JS redirect)
    params = st.query_params
    stored = params.get("_ls_prefix")
    if stored is not None:
        if stored:
            st.session_state["entity_id_prefix"] = stored
        st.session_state["entity_id_prefix_loaded_from_browser"] = True
        try:
            del st.query_params["_ls_prefix"]
        except Exception:
            pass
        return

    # Mark as loaded so we don't try again
    st.session_state["entity_id_prefix_loaded_from_browser"] = True

    # Inject JS to read localStorage and redirect with the value (once)
    components.html(
        f"""
        <script>
        (function() {{
            const KEY = '{_LS_KEY}';
            const PARAM = '_ls_prefix';
            const url = new URL(window.parent.location.href);
            if (url.searchParams.has(PARAM)) return;
            const stored = localStorage.getItem(KEY);
            if (stored && stored.length > 0) {{
                url.searchParams.set(PARAM, stored);
                window.parent.location.replace(url.toString());
            }}
        }})();
        </script>
        """,
        height=0,
    )


def save_entity_prefix_to_browser(value: str):
    """
    Persist the Entity ID Prefix to browser localStorage.
    Injects a zero-height script element.
    """
    safe_value = value.replace("\\", "\\\\").replace("'", "\\'")
    components.html(
        f"""
        <script>
        localStorage.setItem('{_LS_KEY}', '{safe_value}');
        </script>
        """,
        height=0,
    )
