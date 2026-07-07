"""
Page: Generate Test Data

Load a YAML/JSON interface specification and generate test data files + SQL scripts.
Generated files are uploaded to S3 so they appear in the Load File page.

The YAML spec is authored by humans or AI — it defines fields, code tables,
and business rules in a standard format. See tools/specs/ for examples.
"""
import os
import sys
import tempfile

# Ensure pl-test root is on PYTHONPATH
_PL_TEST_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if _PL_TEST_ROOT not in sys.path:
    sys.path.insert(0, _PL_TEST_ROOT)

import streamlit as st
from src.web.sidebar import page_setup

page_setup()

st.markdown("### Generate Test Data")
st.markdown(
    "Load a YAML/JSON interface specification to generate test data files and SQL scripts. "
    "Generated files are uploaded to S3 and appear in the **Load File** page."
)

from tools.src.models import (
    InterfaceSpec, ScenarioType,
    STANDARD_SCENARIOS, EXTENDED_SCENARIOS,
)
from src.clients.s3_client import upload_test_file

_SPECS_DIR = os.path.join(_PL_TEST_ROOT, "tools", "specs")
_WORKSPACE_ROOT = os.path.dirname(_PL_TEST_ROOT)


def _upload_to_s3(filename: str, content: str, interface_type: str) -> bool:
    """Upload generated content to S3 under the interface type prefix."""
    return upload_test_file(filename, content.encode("utf-8"), interface_type=interface_type)


# =============================================================================
# Step 1: Load Specification
# =============================================================================

st.markdown("---")
st.markdown("#### Step 1: Load Specification (YAML/JSON)")

load_method = st.radio("Load from:", ["Upload file", "Select from saved specs"], horizontal=True)

if load_method == "Upload file":
    uploaded = st.file_uploader(
        "Upload YAML or JSON specification",
        type=["yaml", "yml", "json"],
        help="Standard interface spec format. See tools/specs/ for examples.",
    )
    if uploaded:
        import yaml
        try:
            content = uploaded.read().decode("utf-8")
            if uploaded.name.endswith(".json"):
                import json
                data = json.loads(content)
            else:
                data = yaml.safe_load(content)
            spec = InterfaceSpec(**data)
            st.session_state["gen_spec"] = spec.model_dump()
            st.success(f"Loaded: **{spec.meta.display_name}** — {len(spec.detail_fields)} fields, {len(spec.code_tables)} code tables")
        except Exception as e:
            st.error(f"Failed to load spec: {str(e)}")

else:
    os.makedirs(_SPECS_DIR, exist_ok=True)
    yamls = sorted([f for f in os.listdir(_SPECS_DIR) if f.endswith((".yaml", ".yml", ".json"))])

    if yamls:
        selected_yaml = st.selectbox("Select spec:", yamls)
        if st.button("Load"):
            import yaml
            spec_path = os.path.join(_SPECS_DIR, selected_yaml)
            with open(spec_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            spec = InterfaceSpec(**data)
            st.session_state["gen_spec"] = spec.model_dump()
            st.success(f"Loaded: **{spec.meta.display_name}** — {len(spec.detail_fields)} fields, {len(spec.code_tables)} code tables")
    else:
        st.info("No specs found in `tools/specs/`. Upload a YAML file above.")


# =============================================================================
# Show spec preview
# =============================================================================

if "gen_spec" in st.session_state:
    spec = InterfaceSpec(**st.session_state["gen_spec"])

    st.markdown("---")
    st.markdown("#### Specification Details")

    # ─── Meta & Format ────────────────────────────────────────────────────────
    with st.expander("Interface Metadata & Format", expanded=True):
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("**Interface**")
            st.text(f"  Type:        {spec.meta.interface_type}")
            st.text(f"  Name:        {spec.meta.display_name}")
            st.text(f"  Description: {spec.meta.description or '(none)'}")
            st.text(f"  Version:     {spec.meta.version}")
            st.text(f"  Source:      {spec.meta.source_system}")
            st.text(f"  Extension:   {spec.meta.file_extension}")
        with col2:
            st.markdown("**Format**")
            st.text(f"  Type:        {spec.format.type.value}")
            st.text(f"  Delimiter:   '{spec.format.delimiter}'")
            st.text(f"  Header:      {'Yes' if spec.format.has_header_record else 'No'}")
            st.text(f"  Trailer:     {'Yes' if spec.format.has_trailer_record else 'No'}")
            st.text(f"  Encoding:    {spec.format.encoding}")
            st.text(f"  Line ending: {spec.format.line_ending}")

    # ─── Entity & Naming ──────────────────────────────────────────────────────
    with st.expander("Entity & File Naming", expanded=True):
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("**Entity (Primary Identifier)**")
            st.text(f"  ID Field:    {spec.entity.id_field}")
            st.text(f"  ID Length:   {spec.entity.id_length}")
            st.text(f"  Test Prefix: {spec.entity.test_prefix}")
            st.text(f"  Description: {spec.entity.id_description}")
        with col2:
            st.markdown("**File Naming Convention**")
            st.text(f"  Prefix:    {spec.naming.file_prefix}")
            st.text(f"  Suffix:    {spec.naming.environment_suffix}")
            st.text(f"  Extension: {spec.naming.extension}")
            st.text(f"  Example:   {spec.naming.file_prefix}{spec.naming.environment_suffix}{spec.naming.extension}")

    # ─── Record Types ─────────────────────────────────────────────────────────
    if spec.record_types:
        with st.expander(f"Record Types ({len(spec.record_types)})", expanded=False):
            import pandas as pd
            rt_data = [{
                "Code": rt.code,
                "Name": rt.name,
                "Min": rt.min_occurrence,
                "Max": rt.max_occurrence,
                "Per Entity": "Yes" if rt.per_entity else "No",
            } for rt in spec.record_types]
            st.dataframe(pd.DataFrame(rt_data), use_container_width=True, hide_index=True)

    # ─── Fields ───────────────────────────────────────────────────────────────
    # For multi-record-type specs, show fields grouped by record type
    header_keys = {"header", "HDR", "00"}
    non_header_keys = [k for k in spec.fields.keys() if k not in header_keys]

    if len(non_header_keys) > 1:
        # Multi-record-type: show per record type
        with st.expander(f"Fields — All Record Types ({len(spec.detail_fields)} fields total)", expanded=True):
            import pandas as pd
            for rt_key in spec.fields.keys():
                if rt_key in header_keys:
                    continue
                rt_fields = spec.fields[rt_key]
                rt_name = rt_key
                # Find display name from record_types
                for rt in spec.record_types:
                    if rt.code == rt_key:
                        rt_name = f"{rt.code}: {rt.name}"
                        break
                st.markdown(f"**Record Type {rt_name}** ({len(rt_fields)} fields)")
                field_data = [{
                    "Field Name": f.name,
                    "Type": f.type.value,
                    "Length": f.length,
                    "Required": "Yes" if f.required else "",
                    "DB Column": f.db_column or "",
                    "Code Table": f.code_table or "",
                } for f in rt_fields]
                if field_data:
                    st.dataframe(pd.DataFrame(field_data), use_container_width=True, hide_index=True)
    else:
        # Simple format: one flat table
        with st.expander(f"Fields — Detail ({len(spec.detail_fields)} fields)", expanded=True):
            import pandas as pd
            field_data = [{
                "Field Name": f.name,
                "Type": f.type.value,
                "Length": f.length,
                "Required": "Yes" if f.required else "",
                "DB Column": f.db_column or "",
                "Code Table": f.code_table or "",
                "Format": f.format or "",
                "Description": (f.description[:60] + "..." if len(f.description) > 60 else f.description) if f.description else "",
            } for f in spec.detail_fields]
            if field_data:
                st.dataframe(pd.DataFrame(field_data), use_container_width=True, hide_index=True)

    if spec.header_fields:
        with st.expander(f"Fields — Header ({len(spec.header_fields)} fields)", expanded=False):
            hdr_data = [{
                "Field Name": f.name,
                "Type": f.type.value,
                "Length": f.length,
                "Fixed Value": f.fixed_value or "",
            } for f in spec.header_fields]
            st.dataframe(pd.DataFrame(hdr_data), use_container_width=True, hide_index=True)

    # ─── Code Tables ──────────────────────────────────────────────────────────
    if spec.code_tables:
        with st.expander(f"Code Tables ({len(spec.code_tables)} tables)", expanded=False):
            for table_name, table in spec.code_tables.items():
                st.markdown(f"**{table_name}**" + (f" — {table.description}" if table.description else ""))
                codes_data = [{"Code": code, "Description": desc} for code, desc in table.values.items()]
                if codes_data:
                    st.dataframe(pd.DataFrame(codes_data), use_container_width=True, hide_index=True, height=min(35 * len(codes_data) + 38, 200))

    # ─── Business Rules ───────────────────────────────────────────────────────
    if spec.business_rules:
        with st.expander(f"Business Rules ({len(spec.business_rules)})", expanded=False):
            rules_data = [{
                "ID": r.id,
                "Type": r.type,
                "Description": r.description,
                "Affects": ", ".join(r.affects_fields),
                "Logic": r.logic,
            } for r in spec.business_rules]
            st.dataframe(pd.DataFrame(rules_data), use_container_width=True, hide_index=True)

    # ─── Cross-Field Dependencies ─────────────────────────────────────────────
    if spec.cross_field_dependencies:
        with st.expander(f"Cross-Field Dependencies ({len(spec.cross_field_dependencies)})", expanded=False):
            dep_data = [{
                "Condition": d.condition,
                "Fields": ", ".join(d.fields),
            } for d in spec.cross_field_dependencies]
            st.dataframe(pd.DataFrame(dep_data), use_container_width=True, hide_index=True)

    # ─── DB Targets ───────────────────────────────────────────────────────────
    with st.expander("Database Targets (4 Stages)", expanded=False):
        for stage_num in [1, 2, 3, 4]:
            target = getattr(spec.db_targets, f"stage{stage_num}")
            st.markdown(f"**Stage {stage_num}**")
            st.text(f"  Database: {target.database}")
            st.text(f"  Schema:   {target.db_schema}")
            if target.tables:
                for t in target.tables:
                    cols_str = ", ".join(f"{k}→{v}" for k, v in t.columns.items()) if t.columns else "(no column mappings)"
                    st.text(f"  Table:    {t.name}")
                    st.text(f"  Filter:   {t.filter_column or '(none)'}")
                    st.text(f"  Columns:  {cols_str}")
            else:
                st.text("  Tables:   (not configured)")
            st.text("")

    # ==========================================================================
    # Step 2: Select Scenarios
    # ==========================================================================

    st.markdown("---")
    st.markdown("#### Step 2: Select Test Scenarios")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Standard:**")
        sel_baseline = st.checkbox("Baseline (happy path)", value=True)
        sel_max_len = st.checkbox("Max Lengths", value=True)
        sel_min_empty = st.checkbox("Min/Empty Fields", value=True)
        sel_boundary = st.checkbox("Boundary Dates", value=True)
        sel_all_codes = st.checkbox("All Codes", value=True)
        sel_special = st.checkbox("Special Characters", value=True)
        sel_volume = st.checkbox("Large Volume", value=True)
        sel_composite = st.checkbox("Composite Rules", value=True)

    with col2:
        st.markdown("**Extended:**")
        sel_cross = st.checkbox("Cross-Field Dependencies")
        sel_dupes = st.checkbox("Duplicate Detection")
        sel_ordering = st.checkbox("Record Ordering")
        sel_encoding = st.checkbox("Encoding Edge Cases")
        sel_truncation = st.checkbox("Truncation")
        sel_referential = st.checkbox("Referential Integrity")
        sel_historical = st.checkbox("Historical Snapshots")
        sel_code_cov = st.checkbox("Code Coverage")

    volume_size = st.number_input("Volume test size (entities)", value=50, min_value=5, max_value=500, step=5)

    selected_scenarios = []
    if sel_baseline: selected_scenarios.append(ScenarioType.BASELINE)
    if sel_max_len: selected_scenarios.append(ScenarioType.MAX_LENGTHS)
    if sel_min_empty: selected_scenarios.append(ScenarioType.MIN_EMPTY)
    if sel_boundary: selected_scenarios.append(ScenarioType.BOUNDARY_DATES)
    if sel_all_codes: selected_scenarios.append(ScenarioType.ALL_CODES)
    if sel_special: selected_scenarios.append(ScenarioType.SPECIAL_CHARS)
    if sel_volume: selected_scenarios.append(ScenarioType.LARGE_VOLUME)
    if sel_composite: selected_scenarios.append(ScenarioType.COMPOSITE_RULES)
    if sel_cross: selected_scenarios.append(ScenarioType.CROSS_FIELD)
    if sel_dupes: selected_scenarios.append(ScenarioType.DUPLICATES)
    if sel_ordering: selected_scenarios.append(ScenarioType.ORDERING)
    if sel_encoding: selected_scenarios.append(ScenarioType.ENCODING)
    if sel_truncation: selected_scenarios.append(ScenarioType.TRUNCATION)
    if sel_referential: selected_scenarios.append(ScenarioType.REFERENTIAL)
    if sel_historical: selected_scenarios.append(ScenarioType.HISTORICAL)
    if sel_code_cov: selected_scenarios.append(ScenarioType.CODE_COVERAGE)

    st.caption(f"Selected: {len(selected_scenarios)} scenarios")

    # ==========================================================================
    # Step 3: Generate
    # ==========================================================================

    st.markdown("---")
    st.markdown("#### Step 3: Generate")

    col1, col2 = st.columns(2)

    with col1:
        gen_files_btn = st.button("Generate Test Files → S3", type="primary")
    with col2:
        gen_sql_btn = st.button("Generate SQL Scripts → S3")

    # ─── Generate Test Files ──────────────────────────────────────────────────
    if gen_files_btn:
        with st.spinner(f"Generating {len(selected_scenarios)} test files..."):
            try:
                from tools.src.generators.file_generator import FileGenerator

                spec.test_scenarios.volume_size = volume_size
                gen = FileGenerator(spec)

                with tempfile.TemporaryDirectory() as tmpdir:
                    files = gen.generate_all(tmpdir, selected_scenarios)

                    uploaded_count = 0
                    for filepath in files:
                        filename = os.path.basename(filepath)
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                        if _upload_to_s3(filename, content, spec.meta.interface_type):
                            uploaded_count += 1

                st.success(f"Uploaded **{uploaded_count}** test files to S3 (`{spec.meta.interface_type}/`)")
                for filepath in files:
                    st.text(f"  {os.path.basename(filepath)}")
            except Exception as e:
                st.error(f"Error: {str(e)}")

    # ─── Generate SQL Scripts ─────────────────────────────────────────────────
    if gen_sql_btn:
        with st.spinner("Generating SQL scripts..."):
            try:
                from tools.src.generators.sql_generator import SqlGenerator

                gen = SqlGenerator(spec)

                with tempfile.TemporaryDirectory() as tmpdir:
                    files = gen.generate_all(tmpdir)

                    uploaded_count = 0
                    for filepath in files:
                        filename = os.path.basename(filepath)
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                        if _upload_to_s3(f"sql/{filename}", content, spec.meta.interface_type):
                            uploaded_count += 1

                st.success(f"Uploaded **{uploaded_count}** SQL scripts to S3 (`{spec.meta.interface_type}/sql/`)")
                for filepath in files:
                    st.text(f"  {os.path.basename(filepath)}")
            except Exception as e:
                st.error(f"Error: {str(e)}")
