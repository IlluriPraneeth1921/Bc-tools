# Test Case → Scenario Data Reference

Maps each test case to its scenario from `docs/Enrollment_Service_Scenario_Diagrams.md`.  
All test data is centralized in `tests/data/scenario-test-data.ts`.

**Usage in test specs:**
```typescript
import { SCENARIOS } from '../../data/scenario-test-data';
const DATA = SCENARIOS.TC_001;
// DATA.bcInput.enrollmentStartDate → '07/01/2026'
// DATA.transactionCount → 1
// DATA.expectedResponse → 'SU'
```

---

## Test Case ↔ Scenario Mapping

| TC | Scenario ID | Title | Program | Txns | Response | Dates |
|----|-------------|-------|---------|------|----------|-------|
| TC-001 | S220_001_IRIS | New IRIS Enrollment | IRIS | 1 | SU | Enroll: 07/01/2026–12/31/2299 |
| TC-002 | S240_001_IRIS | Enrolled → Suspended (Bounded) | IRIS | 3 | SU | Suspend: 08/15/2026–09/14/2026 |
| TC-003 | S250_001_IRIS | ICA Transfer — Active Span | IRIS | 2 | SU | Agency change eff: 10/01/2026 |
| TC-004 | S220_001_ERROR | Hard Error — FEA Dates | IRIS | 1 | FL | Enroll: 01/01/2026–12/31/2299 |
| TC-005 | S220_001_IDSWAP | Medicaid ID Mismatch | IRIS | 1 | SU | Enroll: 07/01/2026–12/31/2299 |
| TC-006 | S220_004_IRIS | End Date Earlier (Disenroll) | IRIS | 1 | SU | End → 09/30/2026 |
| TC-007 | S220_005a_IRIS | End Date Later (Extension) | IRIS | 1 | SU | End → 12/31/2299 |
| TC-008 | S220_006_IRIS | Referral Withdrawn | IRIS | 1 | SU | Status → Referral Withdrawn |
| TC-009 | S220_007_IRIS | Disenrolled → Enrolled | IRIS | 1 | SU | Enroll: 07/01/2026–12/31/2299 |
| TC-010 | S240_002_IRIS | Open-Ended Suspension | IRIS | 2 | SU | Suspend: 08/15/2026–(null) |
| TC-011 | S240_003_IRIS | Suspension < 3 Days | IRIS | 0 | NONE | Suspend: 08/15/2026–08/16/2026 |
| TC-012 | S230_005_IRIS | Suspension Deleted | IRIS | 2 | SU | Delete suspend 08/15–09/14 |
| TC-013 | S230_006_IRIS | Susp End: Null → Valid | IRIS | 2 | SU | End → 09/14/2026 |
| TC-014 | S700_001_IRIS | Address-Only Update | IRIS | 1 | SU | Address change only |
| TC-015 | S220_001_SDPC | New SDPC Enrollment | SDPC | 1 | SU | Enroll: 07/01/2026–12/31/2299 |
| TC-016 | S250_001_FEA | FEA Transfer | IRIS | 2 | SU | Agency change eff: 10/01/2026 |
| TC-017 | S250_002_IRIS | ICA Transfer During Susp | IRIS | 3 | SU | Agency eff: 09/01/2026 |
| TC-018 | S240_001_SDPC | New SDPC Suspension | SDPC | 3 | SU | Suspend: 08/15/2026–09/14/2026 |
| TC-019 | S220_002_IRIS | Begin Date → Earlier | IRIS | 2 | SU | Begin → 06/01/2026 |
| TC-020 | S220_003_IRIS | Begin Date → Later | IRIS | 2 | SU | Begin → 07/15/2026 |
| TC-021 | S230_001_IRIS | Susp Begin → Earlier | IRIS | 4 | SU | Begin → 08/01/2026 |
| TC-022 | S230_002_IRIS | Susp Begin → Later | IRIS | 3 | SU | Begin → 09/01/2026 |
| TC-023 | S230_003_IRIS | Susp End → Earlier | IRIS | 4 | SU | End → 08/30/2026 |
| TC-024 | S230_004_IRIS | Susp End → Later | IRIS | 3 | SU | End → 10/15/2026 |
| TC-025 | S230_007_IRIS | Susp End: Valid → Null | IRIS | 2 | SU | End → null (indefinite) |
| TC-026 | S220_004_SDPC | SDPC End Date Earlier | SDPC | 1 | SU | End → 09/30/2026 |
| TC-027 | S230_005_SDPC | SDPC Suspension Deleted | SDPC | 2 | SU | Delete suspend |
| TC-028 | S220_005b_IRIS | End Later + Suspension | IRIS | 1 | SU | End → 12/31/2299 |
| TC-029 | S220_001_MULTI_ERR | Multiple MMIS Errors | IRIS | 1 | FL | Enroll: 01/01/2026–12/31/2299 |
| TC-030 | S220_001_SE | SE Response | IRIS | 1 | SE | Enroll: 07/01/2026–12/31/2299 |
| TC-031 | S255_001_IRIS | ICA Transfer — Span-C | IRIS | 3 | SU | Agency eff: 10/01/2026 |
| TC-032 | S700_002_IRIS | Address — No Span | IRIS | 0 | NONE | No current span |
