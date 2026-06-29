"""
Basic password authentication for the Streamlit app.
Credentials are stored in environment variables.
"""
import os
import streamlit as st


def check_auth() -> bool:
    """
    Display a login form and verify credentials.
    Returns True if authenticated, False otherwise.
    """
    # Check if already authenticated in this session
    if st.session_state.get("authenticated"):
        return True

    # Get credentials from environment (defaults for dev)
    valid_username = os.getenv("PL_TEST_USERNAME", "admin")
    valid_password = os.getenv("PL_TEST_PASSWORD", "pltest2026")

    st.title("Pipeline Verification Tool")
    st.markdown("Enter your credentials to access the pipeline verification tool.")

    with st.form("login_form"):
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Login")

    if submitted:
        if username == valid_username and password == valid_password:
            st.session_state["authenticated"] = True
            st.session_state["username"] = username
            st.rerun()
        else:
            st.error("Invalid username or password.")

    return False
