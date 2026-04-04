# Force Immediate Alerts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a temporary in-memory "全部立即" switch in the main dashboard path-alert floating panel that forces all alerts to behave as immediate alerts until turned off.

**Architecture:** Keep alert persistence untouched. Introduce one dashboard-only runtime override flag, derive an effective runtime alert object before advancing runtime state, and reload config on disable to restore true per-alert settings.

**Tech Stack:** Vanilla JS, existing path alert runtime in `app.js` and `path-alert-utils.js`, node test scripts.

---

## Chunk 1: Runtime Override Helper

**Files:**
- Modify: `/Users/xhan/Desktop/market_diff/path-alert-utils.js`
- Test: `/Users/xhan/Desktop/market_diff/tests/path-alert-utils.test.js`

- [ ] Add a failing test for deriving an effective runtime alert with forced immediate mode.
- [ ] Run the test and confirm it fails for the expected missing behavior.
- [ ] Add a minimal helper that returns an alert copy with `triggerMode="immediate"` and `confirmDelaySec=0` when forced.
- [ ] Re-run the targeted test and confirm it passes.

## Chunk 2: Dashboard Wiring

**Files:**
- Modify: `/Users/xhan/Desktop/market_diff/app.js`
- Test: `/Users/xhan/Desktop/market_diff/tests/static-server.test.js`

- [ ] Add a failing static assertion for the new floating-panel toggle and runtime hook usage.
- [ ] Run the static test and confirm it fails.
- [ ] Wire an in-memory `forceImmediateAlerts` flag into the path-alert floating panel toolbar.
- [ ] Use the effective runtime alert helper in both `evaluatePathAlertsOnce()` and `checkPriceForAlerts()`.
- [ ] On disable, clear the override and reload config/runtime state from the server.
- [ ] Re-run the static test and confirm it passes.

## Chunk 3: Regression Verification

**Files:**
- Test: `/Users/xhan/Desktop/market_diff/tests/path-alert-utils.test.js`
- Test: `/Users/xhan/Desktop/market_diff/tests/static-server.test.js`
- Test: `/Users/xhan/Desktop/market_diff/tests/path-alerts-app-fallback.test.js`

- [ ] Run the targeted regression suite.
- [ ] Confirm no unexpected failures.
