# 套利详情 Mini 图表集成 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在套利路径详情弹窗中增加头部图表跳转按钮与延迟加载的 mini 图表预览，同时把详情内容压缩为更适合图表共存的布局。

**Architecture:** 继续复用现有 `Lightweight Charts` 与 `charts-utils.js` 的图表参数拼接逻辑，不引入新图表库。将图表页里的基础渲染逻辑抽成可复用模块，详情弹窗只负责提供 pairs、生命周期和容器；报价详情卡片只做样式压缩，不改原有报价计算流程。

**Tech Stack:** 原生 HTML/CSS/JS，`Lightweight Charts`，Node 测试脚本。

---

## Chunk 1: 测试与图表复用边界

### Task 1: 先锁定渲染预期

**Files:**
- Modify: `tests/arb-panel-renderer.test.js`
- Modify: `tests/charts-utils.test.js`

- [ ] **Step 1: 写一个失败测试，校验详情头部会暴露图表入口所需的数据。**
- [ ] **Step 2: 写一个失败测试，校验图表 pairs 预填仍能稳定生成详情所需链接。**
- [ ] **Step 3: 运行相关测试并确认先失败。**

## Chunk 2: 图表模块抽出 mini 能力

### Task 2: 提供详情弹窗可复用的轻量图表渲染器

**Files:**
- Create: `charts-embed.js`
- Modify: `charts.html`
- Modify: `charts-app.js`

- [ ] **Step 1: 从图表页抽出基础 chart 创建、series 创建、尺寸模式等可复用方法。**
- [ ] **Step 2: 为嵌入场景提供 mini 模式，支持更矮高度和更弱化的视觉元素。**
- [ ] **Step 3: 保持图表页原有行为不变，运行相关测试。**

## Chunk 3: 接入套利详情 UI

### Task 3: 详情头部和图表预览区接入

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `arb-panel-renderer.js`
- Test: `tests/arb-panel-renderer.test.js`

- [ ] **Step 1: 为详情头部加入 `↗` 跳转按钮和图表预览容器。**
- [ ] **Step 2: 打开详情时延迟加载 mini 图表，关闭时销毁。**
- [ ] **Step 3: 调整详情弹窗和卡片样式，让图表与报价信息共存。**
- [ ] **Step 4: 运行相关测试并确认通过。**

## Chunk 4: 验证

### Task 4: 完整验证

**Files:**
- Modify: `tests/static-server.test.js` (如需)

- [ ] **Step 1: 运行本次相关测试。**
- [ ] **Step 2: 运行 `npm test`。**
- [ ] **Step 3: 如有必要做页面 smoke check，确认详情打开/关闭与图表跳转正常。**
