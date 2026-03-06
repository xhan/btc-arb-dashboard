# 历史图表页 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增独立的 `/charts` 页面，用最近两小时快照数据展示交易对历史价格曲线，并接入主页导航与套利面板箭头入口。

**Architecture:** 保持现有主看板、快照页和图表页解耦。服务端在现有快照数据库之上新增只读查询接口，前端新增独立页面和轻量图表模块；套利面板仅增加跳转入口，不把路径联动逻辑耦合进图表页。

**Tech Stack:** Node.js、Express、原生 HTML/CSS/JS、SQLite 快照库、TradingView Lightweight Charts。

### Task 1: 锁定数据查询与入口行为

**Files:**
- Modify: `tests/price-snapshot-store.test.js`
- Modify: `tests/price-snapshot-api.test.js`
- Modify: `tests/arb-panel-renderer.test.js`
- Modify: `tests/static-server.test.js`

**Step 1: Write the failing test**

- 为快照库增加“按交易对查询最近两小时时间序列”和“列出可选交易对”的测试。
- 为服务端增加 `/api/chart-pairs`、`/api/chart-series` 与 `/charts` 的接口测试。
- 为套利面板渲染增加小箭头链接测试。
- 为主页静态内容增加 `/charts` 导航测试。

**Step 2: Run test to verify it fails**

Run: `node tests/price-snapshot-store.test.js && node tests/price-snapshot-api.test.js && node tests/arb-panel-renderer.test.js && node tests/static-server.test.js`

Expected: 因为查询函数、接口和入口尚未实现而失败。

**Step 3: Write minimal implementation**

- 仅实现让上述测试通过所需的最小后端查询、路由和渲染输出。

**Step 4: Run test to verify it passes**

Run: `node tests/price-snapshot-store.test.js && node tests/price-snapshot-api.test.js && node tests/arb-panel-renderer.test.js && node tests/static-server.test.js`

Expected: PASS

### Task 2: 实现快照历史查询模块

**Files:**
- Modify: `price-snapshot-store.js`
- Modify: `tests/price-snapshot-store.test.js`

**Step 1: Write the failing test**

- 测试候选项聚合返回链、symbol、方向、展示文案、搜索关键字。
- 测试时间序列按时间升序返回，且支持正向 / 反向价格。

**Step 2: Run test to verify it fails**

Run: `node tests/price-snapshot-store.test.js`

Expected: FAIL，提示新导出函数不存在或结果不匹配。

**Step 3: Write minimal implementation**

- 新增读取最近窗口内快照报价并聚合候选项的纯函数。
- 新增按 `quoteId + direction` 查询序列的函数。

**Step 4: Run test to verify it passes**

Run: `node tests/price-snapshot-store.test.js`

Expected: PASS

### Task 3: 实现图表页服务端接口

**Files:**
- Modify: `server.js`
- Modify: `tests/price-snapshot-api.test.js`
- Modify: `tests/static-server.test.js`

**Step 1: Write the failing test**

- 验证 `/charts` 静态页可访问。
- 验证 `/api/chart-pairs` 返回候选列表。
- 验证 `/api/chart-series` 返回最近两小时点位，参数非法时返回 400。

**Step 2: Run test to verify it fails**

Run: `node tests/price-snapshot-api.test.js && node tests/static-server.test.js`

Expected: FAIL

**Step 3: Write minimal implementation**

- 增加页面路由与两个只读 API。
- 复用现有 `PRICE_SNAPSHOT_DIR`，不改写快照存储结构。

**Step 4: Run test to verify it passes**

Run: `node tests/price-snapshot-api.test.js && node tests/static-server.test.js`

Expected: PASS

### Task 4: 实现图表页前端

**Files:**
- Create: `charts.html`
- Create: `charts-app.js`
- Create: `charts-utils.js`
- Modify: `tests/static-server.test.js`

**Step 1: Write the failing test**

- 用静态页测试锁定页面标题、搜索框、图表容器和脚本引用。

**Step 2: Run test to verify it fails**

Run: `node tests/static-server.test.js`

Expected: FAIL，因为页面尚不存在或结构缺失。

**Step 3: Write minimal implementation**

- 页面提供搜索输入、候选浮层、添加按钮、多图卡片列表。
- 图表模块负责加载 Lightweight Charts，拿到序列数据后渲染 line series。
- 支持空状态、加载状态、删除图表与重复图表去重。

**Step 4: Run test to verify it passes**

Run: `node tests/static-server.test.js`

Expected: PASS

### Task 5: 接入主页与套利面板入口

**Files:**
- Modify: `index.html`
- Modify: `arb-panel-renderer.js`
- Modify: `tests/arb-panel-renderer.test.js`
- Modify: `tests/static-server.test.js`

**Step 1: Write the failing test**

- 主页顶栏包含 `/charts` 链接。
- 套利机会渲染包含独立的小箭头外链，且不替代原本的 `data-arb-opportunity-id` 点击区域。

**Step 2: Run test to verify it fails**

Run: `node tests/arb-panel-renderer.test.js && node tests/static-server.test.js`

Expected: FAIL

**Step 3: Write minimal implementation**

- 顶栏新增链接。
- 套利机会 HTML 增加 `target="_blank"` 的箭头链接，并避免点击箭头触发现有详情弹窗逻辑。

**Step 4: Run test to verify it passes**

Run: `node tests/arb-panel-renderer.test.js && node tests/static-server.test.js`

Expected: PASS

### Task 6: 全量验证

**Files:**
- Modify: `package.json`（如需）

**Step 1: Run focused tests**

Run: `node tests/price-snapshot-store.test.js && node tests/price-snapshot-api.test.js && node tests/arb-panel-renderer.test.js && node tests/static-server.test.js`

Expected: PASS

**Step 2: Run full test suite**

Run: `npm test`

Expected: PASS
