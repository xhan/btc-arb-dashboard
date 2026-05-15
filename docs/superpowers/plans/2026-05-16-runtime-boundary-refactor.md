# Runtime Boundary Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start the architecture refactor by tightening runtime boundaries and reducing unnecessary recalculation without changing user-visible behavior.

**Architecture:** Add small tested runtime helpers first, then wire them into `app.js` at the highest-cost scheduling points. Keep the current static-script architecture intact so this slice is behavior-preserving and easy to review.

**Tech Stack:** Node.js, Express, browser globals, CommonJS-compatible UMD utility files, existing `node` test runner style.

**Status:** Completed. The runtime helper is now required before `app.js`, scheduler/cache boundaries are wired, and the full test suite has passed after implementation.

---

## File Structure

- Create `dashboard-runtime-utils.js`
  - Owns pure runtime helpers used by browser code and tests.
  - Exports through CommonJS and `window.DashboardRuntimeUtils`.
- Create `tests/dashboard-runtime-utils.test.js`
  - Covers visibility detection, path alert scheduler eligibility, and data terminal cache keys.
- Modify `index.html`
  - Loads `dashboard-runtime-utils.js` before `app.js`.
- Modify `app.js`
  - Requires the helper through an explicit loader guard.
  - Adds dirty refresh gating for the arbitrage panel.
  - Adds path alert scheduler eligibility gating.
  - Adds an interval delay to arbitrage detail refresh.
  - Caches data terminal records.
- Modify `tests/static-server.test.js`
  - Verifies the helper is served before `app.js`.
- Modify `package.json`
  - Adds the new helper test to `npm test`.

## Task 1: Add Runtime Helper

**Files:**
- Create: `dashboard-runtime-utils.js`
- Test: `tests/dashboard-runtime-utils.test.js`
- Modify: `package.json`

- [x] **Step 1: Write failing tests**

Create tests that assert:

- null panels are not visible
- panels with `display: none` are not visible
- panels with any other display are visible
- alert configs with only quote alerts do not need the path scheduler
- enabled path/rule alerts do need the path scheduler
- data terminal cache keys change when quote revision or quote topology changes

- [x] **Step 2: Run the new test**

Run: `node tests/dashboard-runtime-utils.test.js`

Expected: fail because `dashboard-runtime-utils.js` does not exist.

- [x] **Step 3: Implement the helper**

Create the UMD-style helper with:

- `isPanelVisible(panel, getComputedStyleImpl)`
- `hasActivePathAlertEvaluationTarget(alertConfig)`
- `buildDataTerminalRecordsCacheKey(dashboardState, quoteStateRevision)`

- [x] **Step 4: Run the new test**

Run: `node tests/dashboard-runtime-utils.test.js`

Expected: pass.

## Task 2: Wire Scheduling Boundaries

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `tests/static-server.test.js`

- [x] **Step 1: Load helper before app**

Add `<script src="dashboard-runtime-utils.js"></script>` before `app.js`.

- [x] **Step 2: Gate hidden arbitrage panel rebuilds**

Update `scheduleArbUpdate()` so hidden panels mark `arbPanelDirty = true` and skip the timer. When `toggleArbPanel()` opens a dirty panel, render once immediately.

- [x] **Step 3: Gate path alert scheduler**

Update `restartPathAlertScheduler()` to return without setting an interval when `hasActivePathAlertEvaluationTarget(pathAlertConfig)` is false.

- [x] **Step 4: Add controlled detail refresh delay**

Update `startArbDetailLoop()` to wait `ARB_DETAIL_REFRESH_INTERVAL_MS` between successful refresh rounds.

- [x] **Step 5: Cache data terminal records**

Use `buildDataTerminalRecordsCacheKey(dashboardState, quoteStateRevision)` in `buildDataTerminalRecords()` so records are rebuilt only when the dashboard topology or quote revision changes.

## Task 3: Verify

**Files:**
- Modify: none unless tests reveal behavior gaps.

- [x] **Step 1: Syntax check touched browser files**

Run: `node -c app.js && node -c dashboard-runtime-utils.js`

Expected: no output and exit code 0.

- [x] **Step 2: Run targeted tests**

Run: `node tests/dashboard-runtime-utils.test.js && node tests/static-server.test.js && node tests/app-dashboard-queue-behavior.test.js && node tests/path-alert-utils.test.js && node tests/data-terminal-utils.test.js`

Expected: all pass.

- [x] **Step 3: Run full test suite**

Run: `npm test`

Expected: all pass, with only the known Node SQLite experimental warning.
