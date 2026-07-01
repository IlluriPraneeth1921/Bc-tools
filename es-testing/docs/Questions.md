# Questions

I successfully ran TC-003 TC-003 -> ICA Transfer — Active SpanEnrolled (active, SU synced)Enrolled (new ICA agency), how to I confirm that application changes were performed correctly. I think this test case is failing to create time spans on Waiver Enrollment side.

![1782942907918](image/Questions/1782942907918.png)

```typescript
bcInput: {
      enrollmentStartDate: '07/01/2026',
      enrollmentEndDate: '12/31/2299',
      agencyChange: { oldAgency: 'ICA-001', newAgency: 'ICA-002', effectiveDate: '10/01/2026' },
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '07/01/2026', endDate: '12/31/2299', agency: 'ICA-001' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '07/01/2026', endDate: '09/30/2026', agency: 'ICA-001' },
      { label: 'Span-C', status: 'A', beginDate: '10/01/2026', endDate: '12/31/2299', agency: 'ICA-002' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S600', type: 'C', status: 'A', startReason: '2P', stopReason: '2P', description: 'Close span with old ICA' },
      { sequence: 2, scenario: 'S610', type: 'O', status: 'A', startReason: '2P', description: 'Create span with new ICA' },
    ],
```

How do I verify this? 

same for TC-016, TC-019, TC-020
