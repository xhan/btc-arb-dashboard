# Muted Arb Legs Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持在套利路径详情里临时屏蔽某条确定方向的腿，并在提醒日志中查看和恢复当前有效的路径沉默与腿屏蔽状态。

**Architecture:** 复用现有 `mutedPathTargets` 的本地状态模式，新增 `mutedPathLegs` 存储与工具函数。共享套利边在进入 fixed / 分区 / 全局 / 报警快照前统一过滤。提醒日志窗口从单列表扩展为 tab 视图，其中 `临时屏蔽` 只展示当前有效状态，不承担事件日志职责。

**Tech Stack:** 原生前端 JS、`localStorage`、现有 Node 测试脚本

---

## Chunk 1: 腿屏蔽数据与过滤

### Task 1: 写失败测试覆盖腿屏蔽持久化与边过滤

**Files:**
- Create: `tests/muted-path-leg-utils.test.js`
- Modify: `tests/arb-rule-snapshot-utils.test.js`
- Test: `tests/muted-path-leg-utils.test.js`
- Test: `tests/arb-rule-snapshot-utils.test.js`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行测试确认失败**
- [ ] **Step 3: 实现最小工具与过滤接入**
- [ ] **Step 4: 运行测试确认通过**

### Task 2: 接入共享套利快照过滤

**Files:**
- Create: `muted-path-leg-utils.js`
- Modify: `app.js`
- Modify: `arb-rule-snapshot-utils.js`

- [ ] **Step 1: 添加 `mutedPathLegs` 读取、写入和上限裁剪**
- [ ] **Step 2: 在共享 edges 构建后统一过滤被屏蔽腿**
- [ ] **Step 3: 刷新页面后立即恢复腿屏蔽状态**
- [ ] **Step 4: 运行相关测试**

## Chunk 2: 详情入口与提醒日志 tab

### Task 3: 写失败测试覆盖提醒日志 tab 与临时屏蔽列表

**Files:**
- Modify: `tests/static-server.test.js`
- Create: `tests/alert-log-tabs-utils.test.js`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行测试确认失败**
- [ ] **Step 3: 实现最小 UI 结构**
- [ ] **Step 4: 运行测试确认通过**

### Task 4: 接入套利详情腿屏蔽入口

**Files:**
- Modify: `app.js`
- Modify: `index.html`

- [ ] **Step 1: 在详情第一张卡片的腿后增加 `屏蔽` 按钮**
- [ ] **Step 2: 实现 `2/8/12 小时` 的轻量选择逻辑**
- [ ] **Step 3: 触发屏蔽后立即重算套利路径与报警**
- [ ] **Step 4: 运行相关测试**

### Task 5: 扩展提醒日志为 tab 视图

**Files:**
- Create: `alert-log-tabs-utils.js`
- Modify: `app.js`
- Modify: `index.html`

- [ ] **Step 1: 增加 `日志 / 临时屏蔽` tab**
- [ ] **Step 2: 展示 `沉默的路径 / 屏蔽的腿` 两组列表**
- [ ] **Step 3: 接入 `延长 2 小时 / 恢复` 操作**
- [ ] **Step 4: 运行相关测试**

## Chunk 3: 收尾与验证

### Task 6: 回归验证

**Files:**
- Modify: `package.json`（如需纳入测试入口）

- [ ] **Step 1: 运行目标测试集合**
- [ ] **Step 2: 运行语法检查**
- [ ] **Step 3: 手工验证刷新后恢复与恢复按钮行为**
- [ ] **Step 4: 总结是否需要重启服务**
