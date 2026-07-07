"""
Client-side localStorage persistence for the Entity ID Prefix.

Uses Streamlit's components.html to inject JavaScript that runs in the
parent frame (the actual Streamlit page). The script:

1. On DOM ready — reads localStorage and sets the text input value if it
   differs from the default.
2. On blur of the prefix input — writes the current value to localStorage
   so it persists across page reloads / sessions.

No external packages required. Purely client-side.
"""
import streamlit.components.v1 as components

_LS_KEY = "pl_test_entity_id_prefix"


def inject_local_storage_sync():
    """
    Inject a single self-contained JS snippet that handles BOTH loading
    and saving the Entity ID Prefix via browser localStorage.

    The script attaches to the *parent* document (i.e. the Streamlit app)
    and uses a MutationObserver to reliably wait for the input to appear.

    Load behavior (DOMContentLoaded / observer):
        - Finds the Entity ID Prefix text input
        - If localStorage has a saved value AND the input still shows the
          default ("000000000" or empty), it patches the input value and
          dispatches the appropriate React-compatible events.

    Save behavior (blur):
        - Attaches a "focusout" listener on the input. When the user tabs
          or clicks away, the current value is persisted to localStorage.
    """

    components.html(
        f"""
        <script>
        (function() {{
            var LS_KEY = '{_LS_KEY}';
            var DEFAULT_VALUE = '000000000';
            var doc = window.parent.document;

            // --- Utility: find the Entity ID Prefix input ---
            function findPrefixInput() {{
                // Strategy 1: find by Streamlit's widget label test-id
                var labels = doc.querySelectorAll('[data-testid="stWidgetLabel"]');
                for (var i = 0; i < labels.length; i++) {{
                    if (labels[i].textContent.indexOf('Entity ID Prefix') !== -1) {{
                        var container = labels[i].closest('[data-testid="stTextInput"]');
                        if (!container) container = labels[i].parentElement;
                        if (container) {{
                            var inp = container.querySelector('input[type="text"]');
                            if (inp) return inp;
                        }}
                    }}
                }}
                // Strategy 2: find by aria-label
                var inputs = doc.querySelectorAll('input[type="text"]');
                for (var j = 0; j < inputs.length; j++) {{
                    var ariaLabel = inputs[j].getAttribute('aria-label') || '';
                    if (ariaLabel.indexOf('Entity ID Prefix') !== -1) {{
                        return inputs[j];
                    }}
                }}
                return null;
            }}

            // --- Utility: set input value using React-compatible approach ---
            function setNativeValue(input, value) {{
                var nativeSetter = Object.getOwnPropertyDescriptor(
                    window.parent.HTMLInputElement.prototype, 'value'
                ).set;
                nativeSetter.call(input, value);
                // React 16+ listens to these specific events
                input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                input.dispatchEvent(new Event('change', {{ bubbles: true }}));
            }}

            // --- Utility: trigger Streamlit to commit the value ---
            function commitToStreamlit(input) {{
                // Streamlit text_input commits on blur
                input.dispatchEvent(new FocusEvent('blur', {{ bubbles: true }}));
            }}

            // --- Main logic: wire up load + save ---
            function wireUp(input) {{
                // Guard against double-wiring
                if (input.dataset.lsWired) return;
                input.dataset.lsWired = 'true';

                // LOAD: apply stored value if input has the default
                var saved = localStorage.getItem(LS_KEY);
                if (saved && saved !== input.value) {{
                    var current = input.value;
                    if (current === DEFAULT_VALUE || current === '') {{
                        setNativeValue(input, saved);
                        // Small delay before blur so Streamlit's internal
                        // state catches up with the new value
                        setTimeout(function() {{
                            commitToStreamlit(input);
                        }}, 50);
                    }}
                }}

                // SAVE: persist to localStorage when user leaves the input
                input.addEventListener('focusout', function() {{
                    var val = input.value;
                    if (val) {{
                        localStorage.setItem(LS_KEY, val);
                    }}
                }});
            }}

            // --- Entry point: find input or observe until it appears ---
            function init() {{
                var input = findPrefixInput();
                if (input) {{
                    wireUp(input);
                    return;
                }}

                // Input not yet rendered — use MutationObserver to wait
                var observer = new MutationObserver(function(mutations) {{
                    var inp = findPrefixInput();
                    if (inp) {{
                        observer.disconnect();
                        wireUp(inp);
                    }}
                }});

                observer.observe(doc.body, {{
                    childList: true,
                    subtree: true
                }});

                // Safety timeout: stop observing after 10s to avoid leaks
                setTimeout(function() {{
                    observer.disconnect();
                }}, 10000);
            }}

            // Run on DOM ready (or immediately if already ready)
            if (doc.readyState === 'loading') {{
                doc.addEventListener('DOMContentLoaded', init);
            }} else {{
                // DOM already loaded — run after a micro-delay to let
                // Streamlit's React tree finish rendering
                setTimeout(init, 100);
            }}
        }})();
        </script>
        """,
        height=0,
    )


def save_entity_prefix_to_browser(value: str):
    """
    No-op kept for backward compatibility.

    Saving is now handled entirely by the focusout event listener in the
    injected JavaScript. This function can be called safely but does nothing.
    """
    pass
