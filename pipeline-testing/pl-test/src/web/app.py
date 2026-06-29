"""
pl-test Streamlit Web Application.
Entry point for the QA verification UI.

Communicates with the FastAPI backend via HTTP.
Run: streamlit run src/web/app.py
"""
import os
import sys

# Ensure pl-test root is on PYTHONPATH (required for `from src.*` imports)
_PL_TEST_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _PL_TEST_ROOT not in sys.path:
    sys.path.insert(0, _PL_TEST_ROOT)

from src.web.sidebar import page_setup
page_setup()

import streamlit as st

# Main content
st.title("Pipeline Verification Tool")
st.markdown("Automated verification tool for the data pipeline application.")

# Workflow diagram
st.markdown("""
```
┌────────────────────────┐     ┌──────────────────────────────────────────────────────┐
│  Existing Pipeline     │     │          Our QA Test Application                     │
│  Application           │     │                                                      │
│                        │     │  2. Upload/select    3. Click         4. Click       │
│  1. QA triggers        │     │     same .psv file    "Compare"        "Compare"     │
│     file processing    │     │                                                      │
│     (not our app)      │     │       │                  │                │          │
│                        │     │       ▼                  ▼                ▼          │
│  ┌──────────────────┐  │     │  ┌──────────┐     ┌──────────┐     ┌──────────┐      │
│  │ Pipeline runs    │  │     │  │ Parse &  │     │ Compute  │     │ Query    │      │
│  │ (job engine +    │  │     │  │ Show     │     │ expected │     │ actual   │      │
│  │  stored procs)   │  │     │  │ summary  │     │ state at │     │ DBs and  │      │
│  │                  │  │     │  │          │     │ all 4    │     │ compare  │      │
│  │ File → Raw →     │  │     │  │ N provs  │     │ stages   │     │ field by │      │
│  │ Parsed →         │  │     │  │ M recs   │     │          │     │ field    │      │
│  │ Incoming →       │  │     │  └──────────┘     └──────────┘     └────┬─────┘      │
│  │ Carity           │  │     │                                         │            │
│  └──────────────────┘  │     │                                         ▼            │
│                        │     │                                    ┌──────────┐      │
│                        │     │  5. QA reviews mismatch report     │ Mismatch │      │
│                        │     │     (pass/fail per stage,          │ Report   │      │
│                        │     │      drill-down, CSV export)       │ Screen   │      │
│                        │     │                                    └──────────┘      │
│                        │     │  6. QA clicks "Cleanup" when done                    │
│                        │     │     (removes test data from all DBs)                 │
└────────────────────────┘     └──────────────────────────────────────────────────────┘
```
""")

st.divider()
st.markdown("""
**Workflow:**
1. **Load File** — Select a .psv/.xml/.txt/.csv test file from S3 or upload a new one
2. **Compare** — Run verification across all 4 pipeline stages (Raw → Parsed → Transformed → Carity)
3. **Mismatches** — View detailed mismatch reports, filter by stage, export to CSV
4. **Cleanup** — Remove test data from databases when done
5. **Test Runs** — View history of all verification runs
""")
