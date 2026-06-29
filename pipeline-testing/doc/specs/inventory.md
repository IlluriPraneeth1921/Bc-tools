# Interface Inventory & Architecture Analysis

> Generated: June 25, 2026
> Purpose: Capture interface patterns, architectural gaps, and implementation plan for all 10 WI DHS MES interfaces.

---

## Interface Classification

| Interface | Direction | Format | Entity ID | Record Structure | File Ext | Stages | Status |
|-----------|-----------|--------|-----------|-----------------|----------|--------|--------|
| **D03** Waiver Member | Inbound | Pipe-delimited | Member (MCI) | Multi-record type | .psv | 4 stages (file→raw→parsed→transformed→Carity) | Not started |
| **D04** Cost Share | Inbound | Pipe-delimited | Member (MCI) | HDR + DTL | .psv | 4 stages | Not started |
| **D05** IRIS Auth Request | **Outbound** | Pipe-delimited | Authorization # | HDR + DTL + TLR | .txt | Reverse: DB→file generation | YAML spec exists |
| **D05** IRIS Auth Response | **Inbound** | Pipe-delimited | Authorization # | DTL only (no HDR) | .log | 4 stages (updates existing records) | YAML spec exists |
| **D06** Medicaid Provider | Inbound | Pipe-delimited | Provider # | 15 record types (00-14) | .psv | 4 stages | ✅ Complete |
| **D08** FEA Eligibility | **Outbound** | Pipe-delimited | Member (MCI) | HDR + DTL + TLR | .txt | Reverse: DB→file | Not started |
| **D09** FEA Authorization | **Outbound** | Pipe-delimited | Authorization # | HDR + DTL + TLR | .txt | Reverse: DB→file | Not started |
| **D10** EDW File | **Outbound** | Pipe-delimited | Member (MCI) | HDR + DTL + TLR | .txt | Reverse: DB→file | Not started |
| **D11** Auth Utilization | Inbound | Pipe-delimited | Authorization # | HDR + DTL | .psv | 4 stages | Not started |
| **D12** FSIA File | Inbound | Fixed-width | Medicaid ID | HDR + DTL | .txt | 4 stages | ✅ Complete |

### Summary

- **Inbound:** 6 interfaces (D03, D04, D05-response, D06, D11, D12)
- **Outbound:** 4 interfaces (D05-request, D08, D09, D10)
- **Bidirectional:** 1 interface (D05 — request outbound + response inbound)
- **Completed:** 2 (D06, D12)
- **Remaining:** 8 (of which 4 are outbound — a pattern not yet supported)

---

## Spec Documents Available

All specs live in `doc/specs/`. Each interface has an approved PDF and an Excel with unsubmitted updates:

| Interface | PDF (Approved) | Excel (Updates) |
|-----------|---------------|-----------------|
| D03 | FG 2_WI DHS MES CMM_ICD-D03_Waiver Member File v2.0_Approved.pdf | FG 2_WI DHS MES CMM_ICD-D03_Waiver Member File v3.0 Unsubmitted Updates.xlsx |
| D04 | FG 5_WI DHS MES CMM_ICD-D04_Cost Share File_v2.0_Approved.pdf | FG 5_WI DHS MES CMM_ICD-D04_Cost Share File_v3.0_Unsubmitted Updates.xlsx |
| D05 | FG 2_WI DHS MES CMM_ICD-D05_IRIS Authorization File v4.0_Approved.pdf | FG 2_WI DHS MES CMM_ICD-D05_IRIS Authorization File v5.0_Undelivered Updates.xlsx |
| D06 | FG 2_WI DHS MES CMM_ICD-D06_Medicaid Provider File v1.0_Approved.pdf | FG 2_WI DHS MES CMM_ICD-D06_Medicaid Provider File_v2.0 Unsubmitted Updates.xlsx |
| D08 | FG 2_WI DHS MES CMM_ICD-D08_FEA Eligibility File v1.0_Approved.pdf | FG 2_WI DHS MES CMM_ICD-D08_FEA Eligibility File v2.0 Unsubmitted Updates.xlsx |
| D09 | FG 2_WI DHS MES CMM_ICD-D09_FEA Authorization File_v3.0_Approved.pdf | FG 2_WI DHS MES CMM_ICD-D09_FEA Authorization File_v4.0 Unsubmitted Updates.xlsx |
| D10 | FG 6_WI DHS MES CMM_ICD-D10 EDW File v1.0 Approved.pdf | FG 6_WI DHS MES CMM_ICD-D10 EDW File v2.0 Unsubmitted Updates.xlsx |
| D11 | FG 6_WI DHS MES CMM_ICD-D11 Auth Utilization v2.0_Approved.pdf | FG 6_WI DHS MES CMM_ICD-D11 Auth Utilization v3.0_Unsubmitted Updates.xlsx |
| D12 | WI DHS MES CMM_ICD-D12 FSIA File_v1.0_Approved.pdf | WI DHS MES CMM_ICD-D12 FSIA File_v2.0_Unsubmitted Updates.xlsx |

Additional reference: `FG 5_WI DHS MES CMM_C05 Staff Conversion Mapping` (used by D05/D08/D09)

---

## Patterns Identified

### Pattern 1: Standard Inbound (D03, D04, D06, D11, D12)

The existing architecture handles this:

```
Source File (.psv/.txt)
    ↓ Pipeline Job
Stage 1: Raw table (1:1 line-to-row)
    ↓ Stored Procedures
Stage 2: Parsed tables (record types split into typed columns)
    ↓ Stored Procedures + Vocabulary Lookups
Stage 3: Incoming/Transformed tables (business rules applied)
    ↓ Stored Procedures
Stage 4: Final Carity DB tables
```

**Testing flow:**
1. Parse the source file
2. Generate expected state for each stage
3. Wait for pipeline to process
4. Compare expected vs actual at each stage
5. Report mismatches

### Pattern 2: Outbound (D05-request, D08, D09, D10)

**NOT currently supported.** The flow is reversed:

```
Carity DB (source of truth)
    ↓ Pipeline Job (queries DB, applies business rules)
Stage 3: Outgoing/Transformed tables
    ↓ File generation stored procedures
Stage 2: File staging tables
    ↓ File writer
Stage 1: Output file deposited to S3/SFTP
```

**Testing flow (needed):**
1. Set up precondition data in Carity DB (fixtures)
2. Trigger or wait for the outbound pipeline job
3. Capture the generated output file
4. Parse the output file
5. Compare file content against expected content (derived from DB preconditions + business rules)
6. Report mismatches

### Pattern 3: Response/Update Inbound (D05-response)

A special inbound case where:
- The file does NOT create new entities
- It UPDATES existing records (service authorization outcomes)
- Requires pre-existing data in the DB (the authorization records from the request)
- No header or trailer — just detail records

**Testing flow:**
1. Ensure authorization records exist in DB (from a prior D05-request test or fixture setup)
2. Feed a response file
3. Validate that existing records were updated correctly (ResponseOutcomeDisplayName, ResponseErrorNote)
4. Report mismatches

### Pattern 4: Bidirectional / Linked (D05 full cycle)

Combines outbound + inbound with data dependencies:

```
Step 1 (Outbound): Blue Compass generates request file → validate file content
Step 2 (Inbound):  MMIS returns response file → validate DB updates
```

The response references authorization numbers from the request. Testing the full cycle requires:
1. Set up authorization data in BC (pending processing status)
2. Validate the generated request file
3. Simulate the MMIS response (create a response file)
4. Feed the response back
5. Validate DB updates (status changes, error notes)

---

## Architectural Gaps

### Gap 1: No Outbound Testing Framework

The current `BasePlugin` and `BaseComparator` only support inbound: "given a file, compare DB state."

**Needed:** `BaseOutputValidator` — given DB state, validate generated file content.

```python
class BaseOutputValidator(ABC):
    """Validate that an outbound pipeline generated the correct file."""

    @abstractmethod
    def generate_expected_file_content(self, db_state: List[Dict]) -> List[Dict]:
        """Given source DB rows, compute what the output file SHOULD contain."""
        ...

    @abstractmethod
    def parse_output_file(self, filepath: str) -> List[Dict]:
        """Parse the actual generated file."""
        ...

    @abstractmethod
    def compare_output(self, expected: List[Dict], actual: List[Dict]) -> ComparatorResult:
        """Compare expected vs actual file content."""
        ...
```

### Gap 2: No Precondition/Fixture System

Both outbound AND response-type inbound scenarios require the DB to be in a specific state before the test runs.

**Needed:** A fixture definition format + setup/teardown logic.

```yaml
# Example fixture for D05-request outbound test
fixtures:
  - target_db: "WiDHS.Qc.Carity.ToolTestig"
    target_schema: "ServiceAuthorizationModule"
    target_table: "ServiceAuthorization"
    rows:
      - AuthorizationNumber: "4269000001"
        MemberId: "9999999001"
        Status: "Pending Processing"
        FundingSource: "IRIS Waiver"
        # ... more fields
```

**Needed capabilities:**
- Fixture INSERT scripts (establish preconditions)
- Fixture validation (verify preconditions exist before running test)
- Fixture teardown (cleanup after test)

### Gap 3: No Linked Interface Testing (Choreography)

D05 full-cycle testing requires ordered steps with data flowing between them.

**Needed:** A test choreography system:
```
TestSuite:
  Step 1: [outbound] Validate D05-request file generation
  Step 2: [inbound]  Simulate + feed D05-response
  Step 3: [verify]   Check final authorization state in DB
```

### Gap 4: Plugin Architecture Needs Direction Awareness

The current `InterfacePlugin` base class assumes inbound-only.

**Needed additions to InterfacePlugin:**

```python
@property
def direction(self) -> str:
    """One of: 'inbound', 'outbound', 'bidirectional'"""
    ...

def create_output_validator(self) -> BaseOutputValidator:
    """Factory for outbound file validation (outbound/bidirectional only)."""
    ...

def create_fixture_generator(self) -> BaseFixtureGenerator:
    """Factory for precondition setup (outbound + response-type inbound)."""
    ...
```

### Gap 5: Outbound File Delivery/Capture

For outbound testing, we need to know WHERE the pipeline deposits output files and be able to retrieve them.

**Needed:** Configuration for output file locations (S3 paths, local directories) and retrieval logic.

---

## Implementation Plan

### Phase 1: Architecture Extension (Foundation)

Extend the plugin system to support all patterns. Backward-compatible with existing D06/D12.

1. Add `direction` property to `InterfacePlugin`
2. Add `BaseOutputValidator` abstract class
3. Add `BaseFixtureGenerator` abstract class
4. Add fixture YAML schema + setup/teardown logic
5. Add outbound file capture configuration
6. Update the comparison API to handle outbound comparisons

### Phase 2: New Inbound Interfaces (Fastest Wins)

These use the existing architecture — mostly "generate YAML spec → scaffold → fill in details":

| Interface | Complexity | Notes |
|-----------|-----------|-------|
| **D04** Cost Share | Low | Simple HDR+DTL, standard 4 stages |
| **D11** Auth Utilization | Low | Simple HDR+DTL, standard 4 stages |
| **D03** Waiver Member | Medium | Multi-record type (like D06 but fewer record types) |
| **D05 Response** | Medium | Needs fixtures (existing auths in DB), update-only |

### Phase 3: Outbound Interfaces

Requires Phase 1 architecture to be complete:

| Interface | Complexity | Notes |
|-----------|-----------|-------|
| **D08** FEA Eligibility | Medium | Standard outbound HDR+DTL+TLR |
| **D09** FEA Authorization | Medium | Standard outbound HDR+DTL+TLR |
| **D10** EDW File | Medium | Standard outbound HDR+DTL+TLR |
| **D05 Request** | High | Outbound + linked to response, multiple FEAs |

### Phase 4: Full-Cycle / Integration Testing

- D05 bidirectional choreography (request → response → final state)
- Cross-interface dependencies (if any exist between D03/D05/D08)

---

## YAML Spec Status

| Interface | YAML Spec | Location | Notes |
|-----------|-----------|----------|-------|
| D03 | ❌ Not created | — | Needs extraction from PDF/Excel |
| D04 | ❌ Not created | — | Needs extraction from PDF/Excel |
| D05 Request | ✅ Created | `data/icd_D05/ICD-D05-IRIS-Authorization-Request-Spec.yaml` | Complete with business rules |
| D05 Response | ✅ Created | `data/icd_D05/ICD-D05-IRIS-Authorization-Response-Spec.yaml` | Complete |
| D06 | ✅ Created | `pl-test/tools/specs/icd_d06.yaml` | Full spec, plugin complete |
| D08 | ❌ Not created | — | Needs extraction from PDF/Excel |
| D09 | ❌ Not created | — | Needs extraction from PDF/Excel |
| D10 | ❌ Not created | — | Needs extraction from PDF/Excel |
| D11 | ❌ Not created | — | Needs extraction from PDF/Excel |
| D12 | ✅ Created | `pl-test/tools/specs/icd_d12_example.yaml` + `data/icd_D12/ICD-D12-FSIA-File-Spec.yaml` | Full spec, plugin complete |

---

## Common Format Observations

All 10 interfaces share these characteristics:
- **All are pipe-delimited** (except D12 which is fixed-width space-delimited)
- **All use CRLF line endings**
- **All use UTF-8 encoding**
- **Entity IDs are either MCI (10 chars) or Provider/Authorization numbers (15-30 chars)**
- **Test data isolation via ID prefix** (e.g., `000000000` or `42690`)
- **Outbound files all have HDR + DTL + TLR structure**
- **Inbound files vary: some have trailers, some don't; record type counts vary from 1 to 15**

### File Format Matrix

| Interface | Delimiter | Header | Trailer | Record Types | Fields per DTL |
|-----------|-----------|--------|---------|--------------|---------------|
| D03 | `\|` | Yes | ? | Multiple | TBD |
| D04 | `\|` | Yes | ? | HDR + DTL | TBD |
| D05 Req | `\|` | Yes | Yes | HDR + DTL + TLR | 34 |
| D05 Resp | `\|` | No | No | DTL only | 31 |
| D06 | `\|` | Yes | No | 15 types (00-14) | varies |
| D08 | `\|` | Yes | Yes | HDR + DTL + TLR | TBD |
| D09 | `\|` | Yes | Yes | HDR + DTL + TLR | TBD |
| D10 | `\|` | Yes | Yes | HDR + DTL + TLR | TBD |
| D11 | `\|` | Yes | ? | HDR + DTL | TBD |
| D12 | ` ` (space) | Yes | No | HDR + DTL | 69 |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-25 | Document all patterns before coding | Avoid building outbound support that doesn't fit the actual specs |
| — | Phase 1 = architecture first | Outbound support is a fundamental extension, not a bolt-on |
| — | YAML spec is single source of truth | Enables code generation, test data generation, and documentation from one file |
| — | Keep backward compatibility with D06/D12 | Already working and deployed — don't break them |
