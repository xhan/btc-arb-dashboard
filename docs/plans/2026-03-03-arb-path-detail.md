# 套利路径详情 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在实时报价看板中为套利机会增加详情弹窗，支持多组投入金额对比，并在弹窗激活时暂停看板轮询、切换为详情专用刷新。

**Architecture:** 保持现有实时看板和快照页分离；在实时页新增独立的详情弹窗状态和刷新循环。复用现有报价 API 调用能力，但抽出可供详情循环使用的纯请求函数；保留现有看板队列，只在详情模式下暂停 scheduler。

**Tech Stack:** 原生 HTML/CSS/JS，现有 `app.js`、`arb-panel-renderer.js`、Node 测试脚本。

## 详情报价调度补充（2026-03-03）

### 与主看板调度的区别

- 主看板仍然保持现有设计：按 `kyber / zerox / lifi / bybit / solana / sui / starknet` 分队列，用各自 `setInterval` 轮询。
- 详情弹窗**不复用主看板队列**，避免把详情对比请求插进现有监控调度，影响主看板稳定性。
- 因此主看板调度逻辑保持不变，这次只约束详情弹窗自己的请求节奏。

### 详情弹窗当前调度规则

- 详情刷新按卡片顺序串行执行；每张卡片再按套利路径的腿顺序串行请求。
- 例如：4 张卡片、2 条腿，最少是 8 次请求，顺序执行，不会 8 个同时打出。
- 详情刷新不再使用固定的“整轮结束后 sleep 150ms”节流。
- 现在改为：**每次实际发请求前，按本次 source 对应的设置间隔检查是否需要等待。**

### Source 与间隔的映射

- `Kyber -> apiIntervals.kyber`
- `0x -> apiIntervals.zerox`
- `LI.FI -> apiIntervals.lifi`
- `Bybit -> apiIntervals.bybit`
- `Jupiter -> apiIntervals.solana`
- `Cetus -> apiIntervals.sui`
- `Ekubo -> apiIntervals.starknet`

### 设计理由

- 详情弹窗的规则和主看板不同：它是“固定路径、多输入金额、逐腿复算”，天然更适合串行计算。
- 但每个 API 又有各自频率限制，所以详情弹窗不能简单无间隔 while 循环。
- 用“详情独立串行 + 发请求前按 source 限速”的方式，可以同时满足：
  - 不破坏主看板现有调度
  - 遵循各 API 的请求频率设置
  - 避免旧版固定 `150ms` 节流过粗、对不同 source 不准确的问题

### Task 1: 先补测试，锁定新行为

**Files:**
- Modify: `tests/arb-panel-renderer.test.js`
- Create: `tests/arb-detail-utils.test.js`
- Modify: `package.json`

**Step 1:** 为套利机会渲染增加可点击标记测试。
**Step 2:** 为详情默认金额和状态文案增加纯函数测试。
**Step 3:** 运行新测试并确认先失败。

### Task 2: 实现详情纯逻辑模块

**Files:**
- Create: `arb-detail-utils.js`
- Test: `tests/arb-detail-utils.test.js`

**Step 1:** 实现默认 4 组输入金额生成。
**Step 2:** 实现收益/收益率格式化与详情刷新状态文案。
**Step 3:** 跑单测直到通过。

### Task 3: 接入前端弹窗与详情刷新

**Files:**
- Modify: `index.html`
- Modify: `arb-panel-renderer.js`
- Modify: `app.js`

**Step 1:** 新增详情弹窗 DOM、样式、导航状态 tag。
**Step 2:** 让套利机会可点击，并把渲染出来的机会映射缓存到实时页状态。
**Step 3:** 抽出可复用的报价请求函数，新增详情弹窗专用循环。
**Step 4:** 在详情模式下暂停 scheduler、关闭后恢复。

### Task 4: 验证

**Files:**
- Modify: `tests/static-server.test.js` (如需)

**Step 1:** 运行新增测试。
**Step 2:** 运行 `npm test`。
**Step 3:** 如有必要做页面级 smoke check。
