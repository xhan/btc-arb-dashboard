# Legacy Quote Alert Unification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让老的单报价“监控与提醒”统一接入新报警机制，同时保留老弹窗入口，并支持在新报警管理页查看和编辑。

**Architecture:** 新增 `target.type = "quote"` 作为第三类报警目标，统一存入 `alert.config`。运行时保持“报价返回即评估”的事件驱动时机，但状态推进、延迟确认、冷却、音效和远程推送全部复用新报警 runtime，避免退化为独立 `1000ms` 轮询。

**Tech Stack:** Node.js, Express, browser JavaScript, existing `path-alert-*` shared utils, browser-side runtime state

---

## File Structure

- Create: `quote-alert-config-utils.js`
  - 负责旧弹窗字段和新 `quote` 报警记录之间的双向映射
  - 负责稳定 ID 生成与聚合/拆分
- Modify: `path-alert-utils.js`
  - 扩展 `normalizePathAlert` / `normalizeAlertConfig` / `evaluatePathAlert` 以支持 `target.type = "quote"`
  - 继续复用现有 runtime 状态推进逻辑
- Modify: `app.js`
  - 在报价返回后实时驱动 `quote` 报警评估
  - 老弹窗保存 / 打开时改走 `quote-alert-config-utils.js`
  - 统一使用 `alert_path.mp3` 和新报警推送链路
- Modify: `path-alerts-app.js`
  - 新管理页支持查看/编辑 `quote` 报警
  - 列表、表单、校验增加 `quote` 目标
- Modify: `path-alert-notification-utils.js`
  - 如有必要，只补充 `quote` 报警文案格式辅助，不承载 runtime 逻辑
- Test: `tests/path-alert-utils.test.js`
  - `quote` 目标归一化、评估和 runtime 行为
- Create: `tests/quote-alert-config-utils.test.js`
  - 老弹窗字段和 `quote` 报警的双向映射、稳定 ID、聚合/拆分
- Modify: `tests/path-alerts-app-fallback.test.js`
  - 至少锁定管理页对 `quote` 目标的标题/元信息/表单基础渲染
- Modify: `tests/static-server.test.js`
  - 锁定 `app.js` / `path-alerts-app.js` 已暴露 `quote` 报警相关 UI 文本或 wiring
- Modify: `tests/alert-config-api.test.js`
  - 验证共享远程发送链路对 `quote` 报警仍可用

## Chunk 1: Core Quote Target Model

### Task 1: Add failing tests for `quote` target normalization and evaluation

**Files:**
- Modify: `tests/path-alert-utils.test.js`

- [ ] **Step 1: Write the failing normalization test**

Add a case that normalizes:

```js
{
  id: 'quote-alert-101-target-above',
  enabled: true,
  triggerMode: 'delayed',
  confirmDelaySec: '5',
  cooldownSec: '180',
  target: {
    type: 'quote',
    quoteId: '101',
    ruleKind: 'targetAbove',
    value: '0.100113'
  }
}
```

Expected normalized result:
- `target.type === 'quote'`
- `target.quoteId === 101`
- `target.ruleKind === 'targetAbove'`
- `target.value === 0.100113`

- [ ] **Step 2: Write the failing evaluation tests**

Add tests covering:
- `targetAbove`
- `targetBelow`
- `percentUp`
- missing `basePrice` returns unavailable for percent rules

- [ ] **Step 3: Run the focused test to verify it fails**

Run: `node tests/path-alert-utils.test.js`
Expected: FAIL because `quote` target is not supported yet.

### Task 2: Implement `quote` target support in shared path alert utils

**Files:**
- Modify: `path-alert-utils.js`
- Modify: `tests/path-alert-utils.test.js`

- [ ] **Step 1: Extend target normalization**

Add `target.type = "quote"` support in the existing normalizers with:
- `quoteId`
- `ruleKind`
- `value`
- `basePrice`

- [ ] **Step 2: Extend shared evaluation**

Implement `quote` evaluation inside `evaluatePathAlert(alert, options)`:
- read the quote state from `options.quoteStateById`
- for `targetAbove/Below`, compare against current `totalAmountOut`
- for `percentUp/Down`, compare `lastRawPrice` vs `basePrice`
- return `available`, `profitBp`-independent status payload suitable for runtime progression

- [ ] **Step 3: Keep runtime progression generic**

Use the existing `advancePathAlertRuntime(...)` entry point without forking a second state machine.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node tests/path-alert-utils.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add path-alert-utils.js tests/path-alert-utils.test.js
git commit -m "feat: add quote target support to path alert utils"
```

## Chunk 2: Quote Alert Config Mapping

### Task 3: Add failing tests for old modal <-> new quote alert mapping

**Files:**
- Create: `tests/quote-alert-config-utils.test.js`

- [ ] **Step 1: Write a failing test for stable ID generation**

Test:
- `buildQuoteAlertId(101, 'targetAbove')` -> `quote-alert-101-target-above`
- `buildQuoteAlertId(101, 'percentUp')` -> `quote-alert-101-percent-up`

- [ ] **Step 2: Write a failing test for old modal to alert records**

Input:

```js
{
  percentUp: 0.1,
  targetAbove: 0.100113,
  basePrice: 0.1
}
```

Expect:
- 2 `quote` alerts
- stable IDs
- `percentUp` record includes `basePrice`

- [ ] **Step 3: Write a failing test for reverse mapping**

Given 4 `quote` alerts for one `quoteId`, rebuild the old modal view model:
- `percentUp`
- `percentDown`
- `targetAbove`
- `targetBelow`
- `basePrice`

- [ ] **Step 4: Run the focused test to verify it fails**

Run: `node tests/quote-alert-config-utils.test.js`
Expected: FAIL because the helper file does not exist yet.

### Task 4: Implement shared config mapping utility

**Files:**
- Create: `quote-alert-config-utils.js`
- Create: `tests/quote-alert-config-utils.test.js`

- [ ] **Step 1: Implement stable ID helpers**

Add:
- `buildQuoteAlertId(quoteId, ruleKind)`
- `isQuoteAlertId(id)`

- [ ] **Step 2: Implement forward mapping**

Add a function that turns one quote’s old modal fields into an array of normalized `quote` alerts, replacing same-ID records instead of duplicating them.

- [ ] **Step 3: Implement reverse mapping**

Add a function that rebuilds old modal fields from `quote` alerts for one `quoteId`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node tests/quote-alert-config-utils.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add quote-alert-config-utils.js tests/quote-alert-config-utils.test.js
git commit -m "feat: add quote alert config mapping utils"
```

## Chunk 3: Real-Time Runtime Takeover In App

### Task 5: Add failing coverage for app-side takeover wiring

**Files:**
- Modify: `tests/static-server.test.js`
- Modify: `tests/path-alert-notification-utils.test.js`

- [ ] **Step 1: Add a static assertion for quote target wiring**

Extend `tests/static-server.test.js` to assert `app.js` includes a `quote` target path or equivalent marker text.

- [ ] **Step 2: Add a notification formatting assertion if needed**

If the final UX needs a distinct quote alert message block, lock it in `tests/path-alert-notification-utils.test.js`.

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `node tests/static-server.test.js && node tests/path-alert-notification-utils.test.js`
Expected: FAIL before wiring.

### Task 6: Replace old runtime trigger path with unified runtime behavior

**Files:**
- Modify: `app.js`
- Modify: `path-alert-notification-utils.js`
- Modify: `tests/static-server.test.js`
- Modify: `tests/path-alert-notification-utils.test.js`

- [ ] **Step 1: Build app-side lookup for active quote alerts**

Add a focused helper in `app.js` that finds all normalized `quote` alerts for a given `quoteId`.

- [ ] **Step 2: Evaluate quote alerts on quote refresh**

In `fetchSingleQuote()` success flow:
- after `setQuoteMonitorState(...)`
- evaluate matching `quote` alerts immediately
- call the shared runtime advancement logic

- [ ] **Step 3: Unify actions**

On `shouldTrigger`:
- use `alert_path.mp3`
- append log entry through the new alert formatting path
- send remote push through the shared webhook route

On cooldown / pending confirm:
- do not replay continuously
- do not rely on old `logShown` / `alert.mp3`

- [ ] **Step 4: Preserve minimal UI compatibility**

Keep enough old fields/state so the current card and modal do not break while the rest of the migration is in progress.

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `node tests/path-alert-utils.test.js && node tests/quote-alert-config-utils.test.js && node tests/static-server.test.js && node tests/path-alert-notification-utils.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app.js path-alert-notification-utils.js tests/static-server.test.js tests/path-alert-notification-utils.test.js
git commit -m "feat: route legacy quote alerts through unified runtime"
```

## Chunk 4: Dual Entry Sync, Migration, And Management UI

### Task 7: Add failing coverage for management-page support

**Files:**
- Modify: `tests/path-alerts-app-fallback.test.js`

- [ ] **Step 1: Write a failing test for `quote` target display**

Lock in:
- title generation
- meta line
- source type / editor state basics for `quote`

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node tests/path-alerts-app-fallback.test.js`
Expected: FAIL because `quote` target is not rendered yet.

### Task 8: Add `quote` alert editing to the management page

**Files:**
- Modify: `path-alerts-app.js`
- Modify: `tests/path-alerts-app-fallback.test.js`

- [ ] **Step 1: Add a `quote` source/type to the editor**

Support:
- selecting a quote
- choosing `targetAbove/Below/percentUp/percentDown`
- editing `value`
- editing `basePrice` where needed

- [ ] **Step 2: Make list rendering understand `quote` targets**

List rows should show:
- quote label
- rule kind
- target value
- delayed/cooldown state summary

- [ ] **Step 3: Run the focused test to verify it passes**

Run: `node tests/path-alerts-app-fallback.test.js`
Expected: PASS

### Task 9: Wire old modal save/load through the shared mapping util

**Files:**
- Modify: `app.js`
- Modify: `tests/static-server.test.js`

- [ ] **Step 1: Replace old modal save path**

When saving the old “监控与提醒” modal:
- stop treating `quote.alerts` as runtime truth
- sync the resulting records into `alert.config`

- [ ] **Step 2: Replace old modal load path**

When opening the modal:
- first rebuild fields from `quote` alerts in `alert.config`
- fallback to old `quote.alerts` only when no new records exist

- [ ] **Step 3: Add migration on load**

During alert config load or app init:
- scan old `quote.alerts`
- merge into `alert.config` by stable ID
- avoid duplicate creation

- [ ] **Step 4: Run the integration regression suite**

Run: `node tests/path-alert-utils.test.js && node tests/quote-alert-config-utils.test.js && node tests/path-alert-notification-utils.test.js && node tests/path-alerts-app-fallback.test.js && node tests/static-server.test.js && node tests/alert-config-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app.js path-alerts-app.js tests/path-alerts-app-fallback.test.js tests/static-server.test.js tests/alert-config-api.test.js
git commit -m "feat: unify legacy quote alert config and management"
```

## Chunk 5: Final Verification And Documentation Sync

### Task 10: Refresh docs and config examples only if implementation diverged

**Files:**
- Modify: `docs/user/补充说明.md`
- Modify: `docs/路径报警.md`
- Modify: `config_more.json.example`

- [ ] **Step 1: Update docs to match shipped behavior**

Only if implementation changed user-visible semantics beyond the approved spec:
- old modal now routes through new runtime
- `alert_path.mp3` replaces old looping alert sound
- cooldown / delayed now apply to quote alerts

- [ ] **Step 2: Run the full relevant regression set**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Final commit**

```bash
git add docs/user/补充说明.md docs/路径报警.md config_more.json.example
git commit -m "docs: document unified legacy quote alerts"
```
