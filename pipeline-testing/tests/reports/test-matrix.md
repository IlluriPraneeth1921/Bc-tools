# Test Coverage Matrix — Pipeline Testing

Generated: 2026-06-24T13:41:12.901Z

## Summary

| Metric | Count |
|--------|-------|
| **Total Tests** | 121 |
| ATCs (Atomic Test Cases) | 62 |
| UJTs (User Journey Tests) | 11 |
| API Tests | 48 |

## Module Coverage

| Module | ATCs | UJTs | API | Total |
|--------|------|------|-----|-------|
| Cleanup | 10 | 3 | 12 | 25 |
| Files | 10 | 3 | 12 | 25 |
| Compare | 10 | 3 | 10 | 23 |
| Test Runs | 10 | 0 | 10 | 20 |
| Navigation | 15 | 0 | 0 | 15 |
| Auth | 7 | 0 | 0 | 7 |
| Health | 0 | 0 | 4 | 4 |
| Pipeline | 0 | 2 | 0 | 2 |

## Plan Tag Coverage

| Plan Tag | Test Count |
|----------|-----------|
| @regression | 82 |
| @negative | 29 |
| @smoke | 20 |
| @journey | 11 |
| @validation | 6 |
| @508 | 5 |
| @boundary | 4 |

## Full Test Registry

| ID | Type | Module | Plans | File |
|----|------|--------|-------|------|
| API-CLN-001 | API | Cleanup | @negative | api/cleanup.api.spec.ts |
| API-CLN-002 | API | Cleanup | @negative | api/cleanup.api.spec.ts |
| API-CLN-003 | API | Cleanup | @negative, @validation | api/cleanup.api.spec.ts |
| API-CLN-004 | API | Cleanup | @negative, @validation | api/cleanup.api.spec.ts |
| API-CLN-005 | API | Cleanup | @negative, @validation | api/cleanup.api.spec.ts |
| API-CLN-006 | API | Cleanup | @smoke | api/cleanup.api.spec.ts |
| API-CLN-007 | API | Cleanup | @regression | api/cleanup.api.spec.ts |
| API-CLN-008 | API | Cleanup | @regression | api/cleanup.api.spec.ts |
| API-CLN-009 | API | Cleanup | @regression | api/cleanup.api.spec.ts |
| API-CLN-010 | API | Cleanup | @regression | api/cleanup.api.spec.ts |
| API-CLN-011 | API | Cleanup | @negative, @boundary | api/cleanup.api.spec.ts |
| API-CLN-012 | API | Cleanup | @regression | api/cleanup.api.spec.ts |
| API-CMP-001 | API | Compare | @negative | api/compare.api.spec.ts |
| API-CMP-002 | API | Compare | @negative | api/compare.api.spec.ts |
| API-CMP-003 | API | Compare | @negative | api/compare.api.spec.ts |
| API-CMP-004 | API | Compare | @negative | api/compare.api.spec.ts |
| API-CMP-005 | API | Compare | @regression | api/compare.api.spec.ts |
| API-CMP-006 | API | Compare | @regression | api/compare.api.spec.ts |
| API-CMP-007 | API | Compare | @regression | api/compare.api.spec.ts |
| API-CMP-008 | API | Compare | @negative, @boundary | api/compare.api.spec.ts |
| API-CMP-009 | API | Compare | @negative | api/compare.api.spec.ts |
| API-CMP-010 | API | Compare | @regression | api/compare.api.spec.ts |
| API-FIL-001 | API | Files | @smoke | api/files.api.spec.ts |
| API-FIL-002 | API | Files | @smoke | api/files.api.spec.ts |
| API-FIL-003 | API | Files | @negative | api/files.api.spec.ts |
| API-FIL-004 | API | Files | @regression | api/files.api.spec.ts |
| API-FIL-005 | API | Files | @regression | api/files.api.spec.ts |
| API-FIL-006 | API | Files | @negative | api/files.api.spec.ts |
| API-FIL-007 | API | Files | @regression | api/files.api.spec.ts |
| API-FIL-008 | API | Files | @regression | api/files.api.spec.ts |
| API-FIL-009 | API | Files | @regression | api/files.api.spec.ts |
| API-FIL-010 | API | Files | @regression | api/files.api.spec.ts |
| API-FIL-011 | API | Files | @regression | api/files.api.spec.ts |
| API-FIL-012 | API | Files | @regression | api/files.api.spec.ts |
| API-HLT-001 | API | Health | @smoke | api/health.api.spec.ts |
| API-HLT-002 | API | Health | @smoke | api/health.api.spec.ts |
| API-HLT-003 | API | Health | @negative | api/health.api.spec.ts |
| API-HLT-004 | API | Health | @regression | api/health.api.spec.ts |
| API-TRN-001 | API | Test Runs | @smoke | api/test-runs.api.spec.ts |
| API-TRN-002 | API | Test Runs | @regression | api/test-runs.api.spec.ts |
| API-TRN-003 | API | Test Runs | @regression | api/test-runs.api.spec.ts |
| API-TRN-004 | API | Test Runs | @smoke | api/test-runs.api.spec.ts |
| API-TRN-005 | API | Test Runs | @regression | api/test-runs.api.spec.ts |
| API-TRN-006 | API | Test Runs | @negative | api/test-runs.api.spec.ts |
| API-TRN-007 | API | Test Runs | @regression | api/test-runs.api.spec.ts |
| API-TRN-008 | API | Test Runs | @regression | api/test-runs.api.spec.ts |
| API-TRN-009 | API | Test Runs | @regression | api/test-runs.api.spec.ts |
| API-TRN-010 | API | Test Runs | @regression | api/test-runs.api.spec.ts |
| ATC-AUTH-001 | ATC | Auth | @smoke, @regression | atc/auth/auth.spec.ts |
| ATC-AUTH-002 | ATC | Auth | @smoke, @regression | atc/auth/auth.spec.ts |
| ATC-AUTH-003 | ATC | Auth | @regression, @negative | atc/auth/auth.spec.ts |
| ATC-AUTH-004 | ATC | Auth | @regression, @negative, @validation | atc/auth/auth.spec.ts |
| ATC-AUTH-005 | ATC | Auth | @regression, @negative, @validation | atc/auth/auth.spec.ts |
| ATC-AUTH-006 | ATC | Auth | @regression | atc/auth/auth.spec.ts |
| ATC-AUTH-007 | ATC | Auth | @regression | atc/auth/auth.spec.ts |
| ATC-CLN-001 | ATC | Cleanup | @smoke, @regression | atc/cleanup/cleanup.spec.ts |
| ATC-CLN-002 | ATC | Cleanup | @regression | atc/cleanup/cleanup.spec.ts |
| ATC-CLN-003 | ATC | Cleanup | @regression | atc/cleanup/cleanup.spec.ts |
| ATC-CLN-004 | ATC | Cleanup | @regression | atc/cleanup/cleanup.spec.ts |
| ATC-CLN-005 | ATC | Cleanup | @regression | atc/cleanup/cleanup.spec.ts |
| ATC-CLN-006 | ATC | Cleanup | @regression | atc/cleanup/cleanup.spec.ts |
| ATC-CLN-007 | ATC | Cleanup | @regression, @negative, @validation | atc/cleanup/cleanup.spec.ts |
| ATC-CLN-008 | ATC | Cleanup | @regression, @negative | atc/cleanup/cleanup.spec.ts |
| ATC-CLN-009 | ATC | Cleanup | @regression | atc/cleanup/cleanup.spec.ts |
| ATC-CLN-010 | ATC | Cleanup | @regression | atc/cleanup/cleanup.spec.ts |
| ATC-CMP-001 | ATC | Compare | @smoke, @regression | atc/compare/compare.spec.ts |
| ATC-CMP-002 | ATC | Compare | @smoke, @regression | atc/compare/compare.spec.ts |
| ATC-CMP-003 | ATC | Compare | @smoke, @regression | atc/compare/compare.spec.ts |
| ATC-CMP-004 | ATC | Compare | @regression | atc/compare/compare.spec.ts |
| ATC-CMP-005 | ATC | Compare | @regression | atc/compare/compare.spec.ts |
| ATC-CMP-006 | ATC | Compare | @regression, @negative | atc/compare/compare.spec.ts |
| ATC-CMP-007 | ATC | Compare | @regression, @negative | atc/compare/compare.spec.ts |
| ATC-CMP-008 | ATC | Compare | @regression | atc/compare/compare.spec.ts |
| ATC-CMP-009 | ATC | Compare | @regression | atc/compare/compare.spec.ts |
| ATC-CMP-010 | ATC | Compare | @regression, @negative | atc/compare/compare.spec.ts |
| ATC-FIL-001 | ATC | Files | @smoke, @regression | atc/files/files-upload.spec.ts |
| ATC-FIL-002 | ATC | Files | @smoke, @regression | atc/files/files-upload.spec.ts |
| ATC-FIL-003 | ATC | Files | @regression | atc/files/files-upload.spec.ts |
| ATC-FIL-004 | ATC | Files | @regression | atc/files/files-upload.spec.ts |
| ATC-FIL-005 | ATC | Files | @smoke, @regression | atc/files/files-upload.spec.ts |
| ATC-FIL-006 | ATC | Files | @regression, @negative | atc/files/files-upload.spec.ts |
| ATC-FIL-007 | ATC | Files | @regression, @negative | atc/files/files-upload.spec.ts |
| ATC-FIL-008 | ATC | Files | @regression | atc/files/files-upload.spec.ts |
| ATC-FIL-009 | ATC | Files | @regression | atc/files/files-upload.spec.ts |
| ATC-FIL-010 | ATC | Files | @regression, @boundary | atc/files/files-upload.spec.ts |
| ATC-NAV-001 | ATC | Navigation | @smoke, @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-002 | ATC | Navigation | @smoke, @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-003 | ATC | Navigation | @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-004 | ATC | Navigation | @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-005 | ATC | Navigation | @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-006 | ATC | Navigation | @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-007 | ATC | Navigation | @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-008 | ATC | Navigation | @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-009 | ATC | Navigation | @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-010 | ATC | Navigation | @regression | atc/navigation/navigation.spec.ts |
| ATC-NAV-508 | ATC | Navigation | @508 | atc/navigation/navigation-accessibility.spec.ts |
| ATC-NAV-508 | ATC | Navigation | @508 | atc/navigation/navigation-accessibility.spec.ts |
| ATC-NAV-508 | ATC | Navigation | @508 | atc/navigation/navigation-accessibility.spec.ts |
| ATC-NAV-508 | ATC | Navigation | @508 | atc/navigation/navigation-accessibility.spec.ts |
| ATC-NAV-508 | ATC | Navigation | @508 | atc/navigation/navigation-accessibility.spec.ts |
| ATC-TRN-001 | ATC | Test Runs | @smoke, @regression | atc/test-runs/test-runs.spec.ts |
| ATC-TRN-002 | ATC | Test Runs | @smoke, @regression | atc/test-runs/test-runs.spec.ts |
| ATC-TRN-003 | ATC | Test Runs | @regression, @boundary | atc/test-runs/test-runs.spec.ts |
| ATC-TRN-004 | ATC | Test Runs | @regression | atc/test-runs/test-runs.spec.ts |
| ATC-TRN-005 | ATC | Test Runs | @regression | atc/test-runs/test-runs.spec.ts |
| ATC-TRN-006 | ATC | Test Runs | @regression | atc/test-runs/test-runs.spec.ts |
| ATC-TRN-007 | ATC | Test Runs | @regression | atc/test-runs/test-runs.spec.ts |
| ATC-TRN-008 | ATC | Test Runs | @regression, @negative | atc/test-runs/test-runs.spec.ts |
| ATC-TRN-009 | ATC | Test Runs | @regression | atc/test-runs/test-runs.spec.ts |
| ATC-TRN-010 | ATC | Test Runs | @regression | atc/test-runs/test-runs.spec.ts |
| UJT-CLN-001 | UJT | Cleanup | @journey | ujt/cleanup/cleanup-lifecycle.journey.spec.ts |
| UJT-CLN-002 | UJT | Cleanup | @journey | ujt/cleanup/cleanup-lifecycle.journey.spec.ts |
| UJT-CLN-003 | UJT | Cleanup | @journey, @negative | ujt/cleanup/cleanup-lifecycle.journey.spec.ts |
| UJT-CMP-001 | UJT | Compare | @journey | ujt/compare/compare-verification.journey.spec.ts |
| UJT-CMP-002 | UJT | Compare | @journey | ujt/compare/compare-verification.journey.spec.ts |
| UJT-CMP-003 | UJT | Compare | @journey | ujt/compare/compare-verification.journey.spec.ts |
| UJT-FIL-001 | UJT | Files | @journey | ujt/files/file-management.journey.spec.ts |
| UJT-FIL-002 | UJT | Files | @journey | ujt/files/file-management.journey.spec.ts |
| UJT-FIL-003 | UJT | Files | @journey, @negative | ujt/files/file-management.journey.spec.ts |
| UJT-PIP-001 | UJT | Pipeline | @journey | ujt/pipeline/pipeline-verification.journey.spec.ts |
| UJT-PIP-002 | UJT | Pipeline | @journey | ujt/pipeline/pipeline-verification.journey.spec.ts |