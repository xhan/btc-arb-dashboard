# Dashboard Queue-Only Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 主看板的所有报价触发统一只走现有队列，不再有任何直接 `fetchSingleQuote()` 的主看板入口。

**Architecture:** 保留现有 `processQueue()` 作为主看板唯一出网入口。新增一个轻量的“请求排队”辅助方法，让新增报价、恢复暂停、修改 source/channel/showInverse、修改 amount 等入口只更新状态并确保任务在队列中。套利详情、元数据和其他非看板请求保持独立。

**Tech Stack:** 原生前端 JavaScript、Node.js 测试、现有 queue/request-channel 工具。

---

### Task 1: 锁定主看板直连入口

**Files:**
- Modify: `app.js`
- Test: `tests/app-dashboard-queue-behavior.test.js`

- [ ] 写失败测试，覆盖“主看板交互不直接调用 fetchSingleQuote”
- [ ] 运行测试，确认按旧行为失败
- [ ] 实现最小改动，让交互只入队
- [ ] 运行测试，确认通过

### Task 2: 保留非看板请求独立

**Files:**
- Modify: `app.js`
- Test: `tests/app-dashboard-queue-behavior.test.js`

- [ ] 写/扩展测试，锁定套利详情仍不走主看板队列
- [ ] 运行测试，确认失败或缺失覆盖
- [ ] 实现最小改动，避免误伤套利详情
- [ ] 运行测试，确认通过

### Task 3: 回归验证

**Files:**
- Test: `tests/request-channel-utils.test.js`
- Test: `tests/queue-stats-utils.test.js`
- Test: `tests/static-server.test.js`
- Test: `tests/app-dashboard-queue-behavior.test.js`

- [ ] 运行相关测试
- [ ] 检查首屏初始化没有恢复 burst 直连
- [ ] 汇总结果
