Please see below certain areas of interface testing where it can be very
time consuming. Please let me know if you have any questions.

1.  Multiple Field Scenarios(Handling multiple data) - Running scenarios
    to check how the interface reacts to (e.g., multiple emails,
    Medicaid ID, etc). This requires QA\'s to login to QC to check if
    every field on the mapping can handle multiple data elements.

    1.  Multiple Field Scenario\
            C \--\> C1\[Login to QC\]\
            C1 \--\> C2\[Check each field per the mapping(emails,
        MedicaidID, etc)\]\
            C2 \--\> C3\[Verify multiple data elements handled
        correctly\]

2.  Data based scenarios - Coming up with specific data based scenarios
    and running tests. Amazon Q is a great starting point to come up
    with base scenarios, however, very specific examples are needed to
    be created/thought of by the QAs.

    1.  Data-Based Scenario\
            D \--\> D1\[Use Amazon Q for base scenarios\]\
            D1 \--\> D2\[QA manually creates/ thinks of specific
        examples\]\
            D2 \--\> D3\[Run targeted tests\]

3.  Data Length Check (Outbound) - Running prerequisite data to check
    the length for each field and cleaning it up afterward to ensure a
    consistent database state. This requires QAs to run a test on each
    individual field per run.

    1.  Data Length Check

    E \--\> E1\[Run prerequisite data per field\]\
    E1 \--\> E2\[Check length for each field\]\
    E2 \--\> E3\[ Cleanup DB after each run\] -\> Repeat

4.  Required Fields - Running prerequisite data for each required field
    and cleaning it up afterward to ensure a consistent database state.
    This requires QAs to run a test on each required field per run.

    1.  Required Fields\
            F \--\> F1\[Run prerequisite data per required field\]\
            F1 \--\> F2\[Run test per required field -\> Missing\]\
            F2 \--\> F3\[ Cleanup DB after each run\] -\> Repeat

5.  Data Type - Running queries to check the datatypes of all the
    fields.

    1.  Data Type\
            G \--\> G1\[Run queries against all fields\]\
            G1 \--\> G2\[Validate datatypes match expected schema\]

6.  Synchronization - Waiting for the Interface action to fully commit
    to the database before running the next test. Cost Share Interface
    can take up to 5 to 10 minutes per run. Additionally, after the Cost
    Share Interface is done, we have to run additional data sync jobs
    which can take another 5 to 10 minutes.

    1.  Synchronization\
            H \--\> H1\[Trigger Interface Action\]\
            H1 \--\> H2\[ Wait for full DB commit\]\
            H2 \--\> H3\[Confirm commit/validate before next test\]

7.  Test Evidence - For DMI testing, after every test run, we require to
    provide test evidence. The test evidence for the interface can
    include multiple screenshots of the database, UI, JAMS jobs, etc.
    Test evidences can only be captured after all bugs are resolved,
    tested and closed to capture a clean, all pass -- evidence document.

    1.  Test Evidence\
            I \--\> I1\[Complete test run\]\
            I1 \--\> I2\[Capture screenshots:DB, UI, JAMS job\]\
            I2 \--\> I3\[Attach evidence for each test run\]

Biggest time sink is typically test data setup/teardown + data
validation, since every test needs a known starting state and
verification at the DB level.
