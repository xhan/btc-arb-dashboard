# Arb Path Template Cache Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache category/global arb path templates by topology so normal price updates only re-evaluate profit instead of re-running graph search.

**Architecture:** Extract a small helper that builds and evaluates path templates. `app.js` keeps the current fixed/special rule flow unchanged, but category/global sections switch from `findTopCycles` on every refresh to `build templates once -> evaluate many times`. Topology invalidation is separated from price invalidation with a dedicated revision key.

**Tech Stack:** Plain browser JavaScript, existing `arb-paths.js`, existing renderer/tests.

---

### Task 1: Add failing tests for cached template flow

**Files:**
- Create: `/Users/xhan/Desktop/market_diff/tests/arb-path-template-cache-utils.test.js`
- Create: `/Users/xhan/Desktop/market_diff/arb-path-template-cache-utils.js`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Wire topology cache into arb panel data

**Files:**
- Modify: `/Users/xhan/Desktop/market_diff/app.js`
- Test: `/Users/xhan/Desktop/market_diff/tests/arb-path-template-cache-utils.test.js`

- [ ] **Step 1: Add topology revision/cache state**
- [ ] **Step 2: Replace category/global repeated search with template evaluation**
- [ ] **Step 3: Keep fixed/special rule logic unchanged**
- [ ] **Step 4: Run focused tests**

### Task 3: Verify behavior and regression safety

**Files:**
- Test: `/Users/xhan/Desktop/market_diff/tests/arb-path-template-cache-utils.test.js`
- Test: `/Users/xhan/Desktop/market_diff/tests/arb-paths.test.js`
- Test: `/Users/xhan/Desktop/market_diff/tests/arb-rule-snapshot-utils.test.js`

- [ ] **Step 1: Run targeted tests**
- [ ] **Step 2: Run syntax checks for touched files**
- [ ] **Step 3: Review remaining risk before commit**
