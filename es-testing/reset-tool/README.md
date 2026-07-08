# QA Test Data Reset Tool

Interactive CLI tool for resetting test persons to a pristine (blueprint) state. Designed for QA staff who need to reset test data between test runs without deploying stored procedures or managing database credentials.

## What It Does

- **Full Reset** — Deletes all enrollment, ISP, budget, form, location, and staff data for a person, then rebuilds it by cloning from a blueprint person.
- **Wipe Only** — Deletes all data without rebuilding (leaves the person empty).
- **Dry Run** — Shows what would be affected without making any changes.

No stored procedures are deployed to the database. The tool reads the SQL logic from `scripts/ResetPersonToPristineState.sql` and executes it as an ad-hoc batch. This means application redeployments can never break the reset process.

## Prerequisites

- **Node.js** (v18 or later)
- **npm dependencies installed** (`npm install` from the `es-testing` folder)
- **Network access** to the target SQL Server
- **Windows Authentication** — Your Windows account must have access to the target database (the same way SSMS connects with "Windows Authentication")

### ODBC Driver

The tool uses ODBC Driver 17 for SQL Server (or 18). Verify it's installed:

```
Control Panel → Administrative Tools → ODBC Data Sources → Drivers tab
```

You should see "ODBC Driver 17 for SQL Server" or "ODBC Driver 18 for SQL Server" listed.

### Optional: msnodesqlv8

The `msnodesqlv8` package enables true Windows Integrated Auth (no password prompt). It ships with pre-built binaries for most Node.js versions on Windows. If it fails to install, the tool falls back to NTLM authentication (prompts for domain\username\password).

## Setup

1. **Install dependencies** (if not already done):

   ```bash
   cd es-testing
   npm install
   ```

2. **Run the tool**:

   ```bash
   npm run reset-tool
   ```

3. **First-time configuration** — The tool will prompt for:
   - SQL Server hostname (e.g. `mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com`)
   - Database name (e.g. `WiDHS.F2.Carity`)
   - Blueprint PersonKey (default: `9b9a7a67-8baa-4b8b-b31d-b47b012b5e46`)

   These values are saved to `.reset-tool.json` at the project root (gitignored — never committed).

## How to Use

```bash
npm run reset-tool
```

The tool presents an interactive menu:

```
╔══════════════════════════════════════╗
║     QA Test Data Reset Tool          ║
╚══════════════════════════════════════╝

✓ Windows Integrated Auth available (msnodesqlv8)
  Will use your current Windows session — no password needed.

? What would you like to do?
  > Full Reset (wipe + rebuild from blueprint)
    Wipe Only (delete enrollment/ISP data, no rebuild)
    Dry Run (preview what would be affected)
    Configure (change server, database, blueprint)
    Exit
```

### Typical Workflow

1. Select **Dry Run** to preview what will be affected
2. Enter the **PersonKey** (GUID) for the test person you want to reset
3. Review the counts (enrollments, ISPs, etc.)
4. Select **Full Reset** to wipe and rebuild
5. Confirm when prompted

### Changing the Blueprint

The blueprint is the "template" person whose data structure is cloned during a full reset. To change it:

1. Select **Configure** from the menu
2. Enter the new Blueprint PersonKey
3. The value is saved for future runs

### Changing the Target Database

Select **Configure** and update the server/database values. Useful when switching between environments.

## Configuration File

The tool stores preferences in `.reset-tool.json` (gitignored):

```json
{
  "server": "mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com",
  "database": "WiDHS.F2.Carity",
  "domain": "",
  "username": "",
  "blueprintPersonKey": "9b9a7a67-8baa-4b8b-b31d-b47b012b5e46",
  "lastPersonKey": "c7a3862e-f166-466d-a5fb-b4670130aebd"
}
```

| Field | Purpose |
|-------|---------|
| `server` | SQL Server hostname |
| `database` | Target database name |
| `domain` | Windows domain (NTLM fallback only) |
| `username` | Windows username (NTLM fallback only) |
| `blueprintPersonKey` | Template person to clone from during full reset |
| `lastPersonKey` | Last used PersonKey (for convenience — pre-fills the prompt) |

Passwords are **never** stored.

## Authentication

### Windows Integrated (preferred)

If `msnodesqlv8` is installed and working, the tool uses your current Windows session. No credentials are prompted. This is the same mechanism SSMS uses when you select "Windows Authentication."

### NTLM Fallback

If `msnodesqlv8` is not available (e.g. on a machine without build tools or matching pre-built binaries), the tool falls back to NTLM authentication via the Tedious driver. You will be prompted for:

- Windows domain
- Username (without domain prefix)
- Password (prompted each time, never stored)

## Safety Features

- **Dry run always shown first** — Before any destructive operation, the tool shows a preview of what will be affected.
- **Explicit confirmation required** — You must type "Yes" to proceed with a reset.
- **Transaction-wrapped** — All operations run inside a database transaction. If anything fails, everything is rolled back automatically (`XACT_ABORT ON`).
- **No stored procedures deployed** — Nothing is installed on the database. The tool is self-contained.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `ODBC Driver not found` | ODBC Driver 17/18 not installed | Install from [Microsoft](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) |
| `Login failed for user ''` | msnodesqlv8 not linked to ODBC driver correctly | Reinstall: `npm install msnodesqlv8` |
| `Client unable to establish connection` | Network issue or wrong server name | Verify server hostname, check VPN |
| `SQL file not found` | `scripts/ResetPersonToPristineState.sql` missing | Ensure the file exists in the `scripts/` folder |
| `Blueprint Case not found` | Invalid blueprint PersonKey | Update via Configure menu |
| `Person not found` | Invalid target PersonKey | Double-check the GUID |

## File Structure

```
reset-tool/
  index.ts            — CLI entry point (menu, prompts)
  config.ts           — Reads/writes .reset-tool.json
  db-connection.ts    — Hybrid connection (msnodesqlv8 → NTLM fallback)
  reset-person.ts     — Loads SQL from file, executes reset logic
  tsconfig.json       — TypeScript config for the tool
  README.md           — This file
```

## Adding Future Scripts

The tool is designed to be extensible. To add new operations:

1. Add a new SQL file to `scripts/`
2. Create a new module in `reset-tool/` that loads and executes it
3. Add a new menu option in `index.ts`
