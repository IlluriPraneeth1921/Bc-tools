# ES-Testing Training Guide for QA Staff

Welcome! This guide will help you, as a QA team member, set up your computer and learn enough to run the automated Enrollment Service (ES) tests against the Blue Compass (Carity) system. No programming background is required — just follow the steps in order.

---

## Table of Contents

1. [What Is This Project?](#what-is-this-project)
2. [Prerequisites (What You Need Before Starting)](#prerequisites-what-you-need-before-starting)
3. [Concepts You Need to Understand](#concepts-you-need-to-understand)
4. [Step-by-Step Environment Setup](#step-by-step-environment-setup)
5. [Running Your First Test](#running-your-first-test)
6. [Understanding Test Results](#understanding-test-results)
7. [Common Commands Cheat Sheet](#common-commands-cheat-sheet)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Recommended Training &amp; Learning Modules](#recommended-training--learning-modules)
10. [Glossary](#glossary)

---

## What Is This Project?

This project uses **automated browser tests** to verify that the Enrollment Service works correctly. Instead of a person manually clicking through the Blue Compass application, the computer does it automatically and checks the results.

**What the tests do:**

- Open a browser (Chrome)
- Log into Blue Compass with test credentials
- Navigate to a test participant's enrollment records
- Perform enrollment actions (create, suspend, transfer, update, etc.)
- Verify that MMIS transactions are created and processed correctly
- Report pass/fail results

**Why this matters:**

- Tests can be repeated identically every time (no human error)
- Tests run much faster than manual testing
- Results are documented automatically with screenshots

---

## Prerequisites (What You Need Before Starting)

### Hardware & Access Requirements

| Requirement              | Details                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| Windows PC               | Windows 10 or later                                               |
| Internet access          | Must reach the F2 test environment                                |
| VPN access               | If required by your organization to reach AWS-hosted environments |
| Blue Compass credentials | A valid username and password for the F2 test environment         |
| Git access               | Access to the repository where this code lives                    |

### Software You Must Install

Install these in the order listed:

| # | Software                                      | What It Is                                             | Download Link                                           |
| - | --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| 1 | **Git for Windows**                     | Version control — lets you download the project code  | https://git-scm.com/download/win                        |
| 2 | **Node.js (LTS version)**               | JavaScript runtime — required to run the tests        | https://nodejs.org (choose the LTS/Recommended version) |
| 3 | **Visual Studio Code (VS Code)**        | Code editor — where you'll view and manage test files | https://code.visualstudio.com                           |
| 4 | **SQL Server Management Studio (SSMS)** | Database tool — only if you need to run SQL scripts   | https://learn.microsoft.com/en-us/ssms/download         |

> **Note:** When installing Node.js, make sure to check the box that says "Add to PATH" during installation. This allows you to use `node` and `npm` commands from any terminal.

### Skills Prerequisites (Be Honest With Yourself)

Before running these tests, you should be comfortable with:

- [ ] Using Windows File Explorer to navigate folders
- [ ] Opening and using a command prompt or terminal
- [ ] Basic understanding of what a "web application" is
- [ ] Copying and pasting text accurately
- [ ] Reading error messages and following instructions

---

## Concepts You Need to Understand

### The Command Line (Terminal)

The **command line** is a text-based way to give instructions to your computer. Instead of clicking icons, you type commands. In this project, you'll use it to install software and run tests.

**How to open it:**

1. Press `Windows Key + R`
2. Type `cmd` and press Enter

Or in VS Code: use the menu `Terminal` → `New Terminal`

### What Is Node.js and npm?

- **Node.js** = A program that can run JavaScript code outside of a web browser
- **npm** (Node Package Manager) = A tool that comes with Node.js for downloading and managing code libraries (called "packages")

Think of npm as an "app store" for code tools. Our tests need several tools to run, and npm handles downloading them.

### What Is Playwright?

**Playwright** is an automated browser testing tool. It controls a real Chrome browser programmatically — clicking buttons, filling in forms, and checking results just like a human would, but faster and more reliably.

### What Is an Environment File (.env)?

The `.env` file is a configuration file that stores settings the tests need — like the website address, login credentials, and database connection info. It's like a "settings sheet" that you fill in once.

### What Are Test Cases (TC-001 through TC-033)?

Each test case is a specific scenario being verified. For example:

- **TC-001**: Create a brand new IRIS enrollment (the "happy path")
- **TC-002**: Move a participant from Enrolled to Suspended
- **TC-014**: Update only the participant's address

---

## Step-by-Step Environment Setup

### Step 1: Verify Your Installations

Open a command prompt (cmd) and type each command below. You should see version numbers (not errors):

```cmd
git --version
```

Expected output: `git version 2.x.x`

```cmd
node --version
```

Expected output: `v20.x.x` or higher (LTS)

```cmd
npm --version
```

Expected output: `10.x.x` or higher

If any of these show an error like "'git' is not recognized", the software is not installed correctly. Reinstall it.

### Step 2: Clone (Download) the Project

Open a command prompt and navigate to where you want the project:

```cmd
cd C:\Whitelisted\Projects
```

Then clone the repository:

```cmd
git clone <repository-url-provided-by-your-team-lead>
```

This creates a folder with all the project files.

### Step 3: Navigate to the es-testing Folder

```cmd
cd bc-tools-validation-helper\es-testing
```

### Step 4: Install Project Dependencies

This downloads all the code libraries the tests need:

```cmd
npm install
```

Wait for it to finish. You'll see a progress bar and then a summary. Ignore any "warnings" — only "errors" are problems.

### Step 5: Install the Chromium Browser for Testing

Playwright needs its own copy of Chrome:

```cmd
npx playwright install chromium
```

### Step 6: Configure Your Environment File (.env)

The `.env` file should already exist in the `es-testing` folder. Open it in VS Code and verify/update these values:

```
BASE_URL=https://widhs-f2-carity.lower-widhs.aws.feisystems.com
TEST_USER=<your-username>
TEST_PASSWORD=<your-password>

# Context selection (shown during login after Acknowledge)
TEST_ORG=Quantum Services
TEST_LOCATION=Quantum Services Medical Equipment
TEST_STAFF=Self

# Test participant Medicaid ID
TEST_MA_ID=1430000013

# Test participant name (for fallback search)
TEST_PERSON_FIRST=THREE
TEST_PERSON_LAST=TESTFEI

# Test participant UUID (ask your team lead for this value)
TEST_PERSON_UUID=<uuid-from-database>

# Database connection (ask your team lead for these values)
DB_SERVER=<database-server-address>
DB_NAME=<database-name>
DB_USER=<database-username>
DB_PASSWORD=<database-password>

# MMIS mock: set to "true" when real MMIS is unavailable
MOCK_MMIS=false

# Token injection: keep "true" for faster re-logins
USE_TOKEN_INJECTION=true
```

> **Important:** Ask your team lead or tech lead for the actual values of credentials and database settings. Never share the `.env` file or commit it to Git.

### Step 7: Verify Everything Works

Run a quick check that Playwright is configured correctly:

```cmd
npx playwright test --list
```

This should list all available tests without running them. If you see a list of test names, your setup is correct!

---

## Running Your First Test

### Run a Single Test Case (Recommended for First Time)

Start with TC-001 (the simplest "happy path" test):

```cmd
npm run test:tc001
```

This will:

1. Open an invisible Chrome browser
2. Log into Blue Compass
3. Navigate to the test participant
4. Create an IRIS enrollment
5. Verify the MMIS sync completes with status "SU"
6. Report the result

### Watch the Test Run (Headed Mode)

To see the browser in action (helpful for understanding what's happening):

```cmd
npx playwright test tests/atc/enrollment/TC-001-new-iris-enrollment.spec.ts --project=atc --headed
```

### Run All Atomic Test Cases

```cmd
npm run test:atc
```

### Run Tests by Phase

Tests are organized into phases based on what state the participant needs to be in:

| Phase    | What it tests                     | Command                                                 |
| -------- | --------------------------------- | ------------------------------------------------------- |
| Phase 1  | Tests with no prerequisites       | `npm run test:phase1`                                 |
| Phase 2  | Tests requiring active enrollment | `npm run test:phase2`                                 |
| Phase 3  | Tests requiring disenrolled state | `npm run test:phase3`                                 |
| Phase 4  | Tests requiring re-enrollment     | `npm run test:phase4`                                 |
| Phase 5  | Tests requiring active suspension | `npm run test:phase5`                                 |
| Phase 6+ | Advanced scenarios                | `npm run test:phase6` through `npm run test:phase8` |

> **Important:** Run phases in order! Phase 2 depends on Phase 1 completing successfully.

---

## Understanding Test Results

### In the Terminal

After a test run, you'll see output like:

```
  ✓  TC-014: Address-Only Update > ATC-ES-061 - Precondition: Participant is Enrolled (5.2s)
  ✓  TC-014: Address-Only Update > ATC-ES-062 - Update participant residential address (8.1s)
  ✓  TC-014: Address-Only Update > ATC-ES-063 - Verify MMIS sync (1 transaction: S700) (45.3s)

  3 passed (58.6s)
```

- ✓ (green check) = Test passed
- ✗ (red X) = Test failed
- The time in parentheses shows how long each step took

### HTML Report (Visual Report)

After running tests, open the visual report:

```cmd
npm run report
```

This opens a browser showing:

- Which tests passed/failed
- Screenshots taken during the test
- Error details for any failures
- Timing information

### Screenshots

Every test step captures a screenshot. If a test fails, screenshots are saved in the `test-results/` folder — check them to see exactly what was on screen when the failure occurred.

---

## Common Commands Cheat Sheet

| What You Want To Do                                | Command                                        |
| -------------------------------------------------- | ---------------------------------------------- |
| Install dependencies (first time or after updates) | `npm install`                                |
| List all available tests                           | `npx playwright test --list`                 |
| Run ALL tests                                      | `npm test`                                   |
| Run only Atomic Test Cases                         | `npm run test:atc`                           |
| Run only User Journey Tests                        | `npm run test:ujt`                           |
| Run a specific test case (e.g., TC-005)            | `npm run test:tc005`                         |
| Run tests with visible browser                     | `npx playwright test --headed --project=atc` |
| View the HTML report                               | `npm run report`                             |
| Re-authenticate (if login expires)                 | `npm run test:auth-setup`                    |
| Get latest code from repository                    | `git pull`                                   |
| Check your Node version                            | `node --version`                             |
| Check your npm version                             | `npm --version`                              |

---

## Troubleshooting Guide

### "npm is not recognized" or "node is not recognized"

**Cause:** Node.js is not installed or not added to your PATH.
**Fix:** Reinstall Node.js from https://nodejs.org and make sure to check "Add to PATH" during installation. Then close and reopen your terminal.

### "Cannot find module" errors during npm install

**Cause:** Corrupted download or network issue.
**Fix:** Delete the `node_modules` folder and try again:

```cmd
rmdir /s /q node_modules
npm install
```

### Login fails during test

**Cause:** Credentials in `.env` are wrong, or the F2 environment is down.
**Fix:**

1. Double-check `TEST_USER` and `TEST_PASSWORD` in your `.env` file
2. Try logging into Blue Compass manually in your browser to verify credentials work
3. Run in headed mode to see what's happening: `npx playwright test --headed --project=atc`

### "Participant not found" error

**Cause:** The test participant doesn't exist or the UUID is wrong.
**Fix:**

1. Verify `TEST_MA_ID=1430000013` in your `.env`
2. Ask your team lead for the correct `TEST_PERSON_UUID`
3. Try clearing the UUID and letting the test search by MA ID (slower but works as fallback)

### Test times out (takes more than 5 minutes)

**Cause:** MMIS system is slow or unresponsive.
**Fix:**

1. This is often a real environment issue — notify the team
2. If MMIS is known to be down, set `MOCK_MMIS=true` in `.env` (requires database access)
3. Retry later

### Tests fail because of wrong enrollment state

**Cause:** Tests depend on each other. Running TC-005 before TC-001 won't work.
**Fix:** Run tests in phase order, or ask your team lead about resetting test data using the SQL scripts in the `scripts/` folder.

### "Browser closed unexpectedly" or "Target page, context or browser has been closed"

**Cause:** Usually a timeout or environment instability.
**Fix:** Simply re-run the test. If it persists, check your VPN connection and the environment status.

---

## Recommended Training & Learning Modules

Complete these in order. Each builds on the previous one.

### Module 1: Command Line Basics (2-3 hours)

**Goal:** Be comfortable navigating folders and running commands in a terminal.

| Resource                                | Type                    | Link                                                                                              |
| --------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| Command Prompt Basics (Microsoft Learn) | Free Tutorial           | https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands |
| "Learn the Command Line" — Codecademy  | Free Interactive Course | https://www.codecademy.com/learn/learn-the-command-line                                           |

**Practice exercises:**

- Navigate to your Documents folder using only commands
- Create a new folder, create a file in it, then delete both
- List files in a directory

### Module 2: Git Basics (3-4 hours)

**Goal:** Clone repositories, pull updates, and understand basic version control.

| Resource                      | Type                 | Link                                                            |
| ----------------------------- | -------------------- | --------------------------------------------------------------- |
| Git Handbook (GitHub)         | Free Guide           | https://guides.github.com/introduction/git-handbook/            |
| "Git It" Desktop App          | Interactive Tutorial | https://github.com/jlord/git-it-electron                        |
| Git for Beginners (Atlassian) | Free Tutorial        | https://www.atlassian.com/git/tutorials/what-is-version-control |

**You need to know:**

- `git clone` — download a repository
- `git pull` — get the latest changes
- `git status` — see what's changed
- How to avoid accidentally modifying files others depend on

### Module 3: Node.js and npm Fundamentals (2-3 hours)

**Goal:** Understand what Node/npm are and how to use npm commands.

| Resource                                | Type        | Link                                                                                   |
| --------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| Introduction to npm (npmjs.com)         | Free Docs   | https://docs.npmjs.com/getting-started                                                 |
| Node.js for Beginners (Microsoft Learn) | Free Course | https://learn.microsoft.com/en-us/training/paths/build-javascript-applications-nodejs/ |

**You need to know:**

- `npm install` — install project dependencies
- `npm run <script>` — run a named script from package.json
- `npx <command>` — run a tool without installing it globally
- What `package.json` is (a project's "recipe card")
- What `node_modules/` is (the "ingredients" downloaded by npm)

### Module 4: Playwright Test Runner (3-4 hours)

**Goal:** Understand how to run Playwright tests and read results.

| Resource                                      | Type          | Link                                                        |
| --------------------------------------------- | ------------- | ----------------------------------------------------------- |
| Playwright Getting Started                    | Official Docs | https://playwright.dev/docs/intro                           |
| Playwright Test Runner Guide                  | Official Docs | https://playwright.dev/docs/running-tests                   |
| Playwright HTML Reporter                      | Official Docs | https://playwright.dev/docs/test-reporters                  |
| "Playwright Tutorial for Beginners" (YouTube) | Video         | Search YouTube for "Playwright tutorial for beginners 2024" |

**You need to know:**

- How to run tests with `npx playwright test`
- How to run a single test file
- How to use `--headed` to watch tests
- How to read the HTML report
- How to interpret pass/fail output

### Module 5: Understanding the Enrollment Domain (Ongoing)

**Goal:** Know the business logic being tested.

| Resource                                    | Location                                                     |
| ------------------------------------------- | ------------------------------------------------------------ |
| Enrollment Service ICD-D01 V6.0 (full spec) | `docs/Enrollment_Service_ICD_D01_V6.0_Complete_Context.md` |
| Decision Tables (what triggers what)        | `docs/Enrollment_Webservice_Decision_Tables.md`            |
| Scenario Diagrams (visual flows)            | `docs/Enrollment_Service_Scenario_Diagrams.md`             |
| Carity Database Reference                   | `docs/carity-db.md`                                        |
| Individual Test Case Specs                  | `test-cases/TC-001*.md` through `test-cases/TC-033*.md`  |

**You need to understand:**

- What IRIS and SDPC programs are
- Enrollment lifecycle: Enrolled → Suspended → Disenrolled
- What MMIS is and what a "sync" means
- What SU (Success), FL (Failure), and SE (Success with Errors) mean

### Module 6: Visual Studio Code Basics (1-2 hours)

**Goal:** Navigate files, use the integrated terminal, and make minor edits.

| Resource                            | Type          | Link                                                      |
| ----------------------------------- | ------------- | --------------------------------------------------------- |
| VS Code Getting Started             | Official Docs | https://code.visualstudio.com/docs/getstarted/introvideos |
| "VS Code in 100 Seconds" (Fireship) | YouTube Video | https://www.youtube.com/watch?v=KMxo3T_MTvY               |

**You need to know:**

- Open a folder/project
- Use the Explorer panel to navigate files
- Open the integrated terminal (``Ctrl+` ``)
- Search across files (Ctrl+Shift+F)
- Edit `.env` files

---

## Learning Path Summary

```
Day 1:  Module 1 (Command Line) + Module 2 (Git)
         → You can download the project and navigate it

Day 2:  Module 3 (Node/npm) + Module 6 (VS Code)
         → You can install dependencies and use the editor

Day 3:  Module 4 (Playwright) + Environment Setup (this guide)
         → You can run tests and read results

Day 4+: Module 5 (Domain Knowledge)
         → You understand what the tests are validating
```

---

## Glossary

| Term                  | Meaning                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| **ATC**         | Atomic Test Case — a small, focused test that verifies one specific thing |
| **UJT**         | User Journey Test — a longer test that follows a full user workflow       |
| **Playwright**  | The automated browser testing tool used in this project                    |
| **npm**         | Node Package Manager — installs and manages code dependencies             |
| **npx**         | Runs a package command without global installation                         |
| **Node.js**     | The JavaScript runtime that powers the test framework                      |
| **CLI**         | Command Line Interface — the text-based terminal                          |
| **Headless**    | Running the browser invisibly (no window shown)                            |
| **Headed**      | Running the browser visibly (you can watch it)                             |
| **.env**        | Environment file — stores configuration and credentials                   |
| **MMIS**        | Medicaid Management Information System                                     |
| **SU**          | Successful response from MMIS                                              |
| **FL**          | Failure response from MMIS                                                 |
| **SE**          | Success with Errors — partial success from MMIS                           |
| **IRIS**        | A Medicaid waiver program type                                             |
| **SDPC**        | Another Medicaid program type (Self-Directed Personal Care)                |
| **ICA**         | Inter-County Agency transfer                                               |
| **FEA**         | Fiscal Employer Agent transfer                                             |
| **Sync**        | The process of sending enrollment data to MMIS and receiving a response    |
| **Span**        | An enrollment time period with start and end dates                         |
| **git clone**   | Download a copy of the code repository                                     |
| **git pull**    | Update your local copy with the latest changes                             |
| **npm install** | Download all the required dependencies for the project                     |

---

## Quick Reference: The Rinse-and-Repeat Workflow

Once your environment is set up, your daily workflow is:

```
1. Open VS Code → Open the es-testing folder
2. Open the terminal (Ctrl+`)
3. Get latest code:          git pull
4. Install any new deps:     npm install
5. Run the test you need:    npm run test:tc001
6. Check results:            npm run report
7. If something fails:       Check the Troubleshooting section above
```

That's it! If tests start failing that were passing before, common causes are:

- Environment is down (check with your team)
- Test data needs resetting (notify your team lead)
- Code was updated (run `git pull` then `npm install`)

---

## Getting Help

If you're stuck:

1. Read the error message carefully — it usually tells you what's wrong
2. Check the [Troubleshooting Guide](#troubleshooting-guide) above
3. Ask your team lead or the developer who maintains this repository
4. Check the project's `README.md` file for additional details

---

*Last updated: July 2026*
