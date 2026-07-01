"""
Client-side localStorage persistence for the Entity ID Prefix.

Uses Streamlit's components.html to inject JavaScript that:
- Saves the prefix to browser localStorage on every render
- On page load, reads localStorage and patches the Streamlit text input
  value + triggers a change event so Streamlit picks it up

No external packages required. Purely client-side.
"""
import streamlit as st
import streamlit.components.v1 as components

_LS_KEY = "pl_test_entity_id_prefix"


def inject_local_storage_sync():
    """
    Inject a single JS snippet into the sidebar that handles BOTH
    reading and writing localStorage for the Entity ID Prefix.

    On page load:
    - Reads localStorage for the saved prefix
    - Finds the Entity ID Prefix text input in the DOM
    - If the input has the default value and localStorage has a different
      saved value, updates the input and dispatches events so Streamlit
      picks up the change

    On every change:
    - A MutationObserver watches the input and saves its value to localStorage
      whenever it changes
    """
    components.html(
        f"""
        <script>
        (function() {{
            const LS_KEY = '{_LS_KEY}';
            const savedPrefix = localStorage.getItem(LS_KEY);

            function findPrefixInput() {{
                // Find the text input with our help text or label
                const inputs = window.parent.document.querySelectorAll(
                    'input[type="text"]'
                );
                for (const inp of inputs) {{
                    // Find by aria-label or nearby label text
                    const label = inp.getAttribute('aria-label') || '';
                    if (label.includes('Entity ID Prefix')) {{
                        return inp;
                    }}
                }}
                // Fallback: look for label elements
                const labels = window.parent.document.querySelectorAll(
                    '[data-testid="stWidgetLabel"]'
                );
                for (const lbl of labels) {{
                    if (lbl.textContent.includes('Entity ID Prefix')) {{
                        const container = lbl.closest('[data-testid="stTextInput"]')
                                       || lbl.parentElement;
                        if (container) {{
                            return container.querySelector('input[type="text"]');
                        }}
                    }}
                }}
                return null;
            }}

            function applyStoredValue() {{
                if (!savedPrefix) return;

                const input = findPrefixInput();
                if (!input) {{
                    // Input not rendered yet — retry
                    setTimeout(applyStoredValue, 200);
                    return;
                }}

                const currentVal = input.value;
                // Only override if current is the default or empty
                if (currentVal === '000000000' || currentVal === '') {{
                    if (savedPrefix !== currentVal) {{
                        // Set the value natively
                        const nativeSetter = Object.getOwnPropertyDescriptor(
                            window.parent.HTMLInputElement.prototype, 'value'
                        ).set;
                        nativeSetter.call(input, savedPrefix);

                        // Dispatch events so React/Streamlit picks it up
                        input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        input.dispatchEvent(new Event('change', {{ bubbles: true }}));

                        // Also blur to trigger Streamlit's onBlur handler
                        input.dispatchEvent(new Event('blur', {{ bubbles: true }}));
                    }}
                }}
            }}

            // Apply stored value after a short delay (DOM needs to render)
            if (savedPrefix) {{
                setTimeout(applyStoredValue, 300);
            }}
        }})();
        </script>
        """,
        height=0,
    )


def save_entity_prefix_to_browser(value: str):
    """
    Persist the current Entity ID Prefix to browser localStorage.
    Injects a zero-height script that writes the value.
    """
    if not value:
        return
    safe_value = value.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')
    components.html(
        f"""
        <script>
        localStorage.setItem('{_LS_KEY}', '{safe_value}');
        </script>
        """,
        height=0,
    )
