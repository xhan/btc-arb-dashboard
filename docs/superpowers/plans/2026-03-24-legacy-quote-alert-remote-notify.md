# Legacy Quote Alert Remote Notify Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让老的单报价“监控与提醒”在本地声音与日志之外，也复用新路径报警的远程推送配置发送到 Telegram / day.app。

**Architecture:** 保持服务端发送入口不变，前端老提醒在原有 `triggerAlert()` 触发点追加一次异步远程发送。通知标题与正文拼装抽到共享通知工具，避免把格式化逻辑散落在 `app.js` 中。

**Tech Stack:** Node.js, Express, browser JavaScript, existing alert config + notification utils

---

## Chunk 1: Shared Notification Payload

### Task 1: Add a tested payload builder for legacy quote alerts

**Files:**
- Modify: `path-alert-notification-utils.js`
- Modify: `tests/path-alert-notification-utils.test.js`

- [ ] **Step 1: Write the failing test**

Add a test for a helper that turns legacy quote alert context into `{ title, body }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/path-alert-notification-utils.test.js`
Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add a helper that formats:
- `title`: `[监控提醒] <链名>`
- `body`: `<交易对标签>\n<命中原因>`

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/path-alert-notification-utils.test.js`
Expected: PASS

## Chunk 2: Wire Legacy Quote Alerts To Remote Sending

### Task 2: Call existing remote alert API from the old quote alert trigger

**Files:**
- Modify: `app.js`
- Test: `tests/static-server.test.js`

- [ ] **Step 1: Add a narrow assertion for the app wiring**

Extend static coverage so `app.js` still exposes the existing alert API usage and the new legacy quote alert marker text.

- [ ] **Step 2: Run test to verify it can fail**

Run: `node tests/static-server.test.js`
Expected: FAIL before wiring if the new marker text is missing.

- [ ] **Step 3: Write minimal implementation**

Add an async sender for legacy quote alerts that:
- respects `alert.config.settings.webhookEnabled`
- reuses `/api/send-path-alert-webhook`
- logs failures without affecting local sound/log behavior

- [ ] **Step 4: Run focused tests**

Run: `node tests/path-alert-notification-utils.test.js && node tests/static-server.test.js`
Expected: PASS

## Chunk 3: Verify Existing Remote Path

### Task 3: Guard against regressions in the shared backend route

**Files:**
- Test: `tests/alert-config-api.test.js`

- [ ] **Step 1: Run backend API regression test**

Run: `node tests/alert-config-api.test.js`
Expected: PASS, confirming the shared remote sending route still delivers to Telegram / day.app.
