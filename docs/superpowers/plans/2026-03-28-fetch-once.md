# Fetch Once Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除服务端内部 HTTP retry，把通用请求工具重命名为 `fetchOnce`，让失败交给上层队列或调用方在下一轮自然重试。

**Architecture:** 抽出独立 `fetch-once.js` 模块，负责“按请求通道注入代理后发起一次请求并解析错误”。`server.js` 和 `market-clients` 全部改用 `fetchOnce`，不再保留 `fetchWithRetry` 别名。

**Tech Stack:** Node.js、现有 request-channel 代理工具、原生测试脚本。

---

### Task 1: 写失败测试

**Files:**
- Create: `tests/fetch-once.test.js`

- [ ] 写测试，锁定失败时只发一次请求
- [ ] 运行测试，确认红灯

### Task 2: 实现 fetchOnce

**Files:**
- Create: `fetch-once.js`
- Modify: `server.js`
- Modify: `market-clients/index.js`
- Modify: `market-clients/providers/*.js`

- [ ] 实现 `fetchOnce`
- [ ] server 与 market-clients 全量改名
- [ ] 不保留内部 retry 逻辑

### Task 3: 更新测试并回归

**Files:**
- Modify: `tests/market-clients-index.test.js`
- Modify: `tests/market-clients-providers.test.js`
- Modify: `package.json`

- [ ] 更新调用名
- [ ] 跑相关测试
