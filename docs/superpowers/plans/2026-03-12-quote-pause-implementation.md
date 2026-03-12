# 交易对暂停功能 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为交易对增加可暂停/恢复的“伪删除”能力，让暂停项不再参与报价、路径、报警、快照和队列统计，同时在主看板继续显示灰态条目。

**Architecture:** 新增一个轻量共享工具模块统一封装 `paused` 语义与运行态清理，Node 侧与浏览器侧都复用它，避免把暂停判断散落到 `app.js`、`server.js`、`path-alerts-app.js`、`queue-stats-utils.js`。实现顺序按 TDD 先锁定共享语义和非 UI 消费者，再把主看板按钮、灰态与队列切换接上。

**Tech Stack:** 原生 HTML/CSS/JS，Node 测试脚本，Express 静态服务。

---

## Chunk 1: 共享暂停语义与非 UI 消费方

### Task 1: 先把暂停语义抽成可测试的共享工具

**Files:**
- Create: `quote-pause-utils.js`
- Create: `tests/quote-pause-utils.test.js`
- Modify: `index.html`
- Modify: `path-alerts.html`
- Modify: `queue-stats.html`
- Modify: `tests/static-server.test.js`

- [ ] **Step 1: 写失败测试，锁定共享工具的三个基础行为。**
  - `isQuotePaused({ paused: true }) === true`
  - `getActiveQuotes([...])` 会过滤暂停项
  - `buildPausedQuoteState(previousState)` 第一轮只锁定最小字段集合：
    - 清空 `lastRawPrice`
    - 清空 `lastResultText`
    - 保留 `fromSymbol`
    - 保留 `toSymbol`

- [ ] **Step 2: 运行测试，确认它先失败。**
  Run: `node tests/quote-pause-utils.test.js`
  Expected: FAIL，提示缺少模块或断言不成立

- [ ] **Step 3: 写最小实现，导出浏览器/Node 都可用的共享工具。**
  - 采用现有 util 一致的 UMD 风格
  - 导出 `isQuotePaused`
  - 导出 `getActiveQuotes`
  - 导出 `buildPausedQuoteState`

- [ ] **Step 4: 把浏览器页面接上共享工具脚本。**
  - `index.html` 在 `queue-stats-utils.js` 和 `app.js` 前引入
  - `path-alerts.html` 在 `path-alerts-app.js` 前引入
  - `queue-stats.html` 在 `queue-stats-utils.js` 前引入
  - `tests/static-server.test.js` 补静态资源引用断言

- [ ] **Step 5: 重新运行相关测试，确认转绿。**
  Run: `node tests/quote-pause-utils.test.js && node tests/static-server.test.js`
  Expected: PASS

- [ ] **Step 6: 提交这一小步。**
  Run: `git add quote-pause-utils.js tests/quote-pause-utils.test.js index.html path-alerts.html queue-stats.html tests/static-server.test.js && git commit -m "feat: add shared quote pause utils"`

### Task 2: 让候选、统计、快照先遵守暂停语义

**Files:**
- Create: `path-alert-candidate-utils.js`
- Create: `price-snapshot-payload-utils.js`
- Create: `tests/path-alert-candidate-utils.test.js`
- Create: `tests/path-alerts-app-fallback.test.js`
- Create: `tests/price-snapshot-payload-utils.test.js`
- Modify: `index.html`
- Modify: `path-alerts.html`
- Modify: `queue-stats-utils.js`
- Modify: `server.js`
- Modify: `path-alerts-app.js`
- Modify: `app.js`
- Modify: `tests/queue-stats-utils.test.js`
- Modify: `tests/path-alert-candidates-api.test.js`
- Modify: `tests/static-server.test.js`

- [ ] **Step 1: 写失败测试，锁定非 UI 消费方的暂停行为。**
  - `tests/queue-stats-utils.test.js`：暂停项不再计入 quote/task/inverse 统计
  - `tests/path-alert-candidates-api.test.js`：暂停项不会出现在候选腿 API 中
  - `tests/path-alert-candidate-utils.test.js`：本地 fallback 和 server 共享的候选构建逻辑会过滤暂停项
  - `tests/path-alerts-app-fallback.test.js`：当候选 API 不可用时，`path-alerts-app.js` 的 fallback 路径仍会过滤暂停项
  - `tests/price-snapshot-payload-utils.test.js`：暂停项不会出现在新生成的快照 payload 中
  - `tests/static-server.test.js`：`index.html` / `path-alerts.html` 已引入新共享 util，且 `path-alerts-app.js` / `app.js` 已包含对新共享 util 的调用痕迹

- [ ] **Step 2: 运行相关测试，确认先失败。**
  Run: `node tests/queue-stats-utils.test.js && node tests/path-alert-candidate-utils.test.js && node tests/path-alerts-app-fallback.test.js && node tests/path-alert-candidates-api.test.js && node tests/price-snapshot-payload-utils.test.js && node tests/static-server.test.js`
  Expected: FAIL，暂停项仍被计入、仍出现在候选结果中、仍出现在快照 payload 中，或浏览器侧接线尚不存在

- [ ] **Step 3: 接入共享工具的最小实现。**
  - `queue-stats-utils.js` 统计前跳过暂停项
  - 抽出 `path-alert-candidate-utils.js`，让 `server.js` 与 `path-alerts-app.js` 共用暂停过滤后的候选构建逻辑
  - 把 `path-alerts-app.js` 的 fallback 构建入口压成可测的最小函数，并用 `tests/path-alerts-app-fallback.test.js` 锁定“API 不可用时仍会过滤暂停项”
  - 抽出 `price-snapshot-payload-utils.js`，让 `app.js` 用它生成已过滤暂停项的快照 payload
  - `index.html` 与 `path-alerts.html` 补上新共享 util 的 script 引入
  - `server.js` 的 `buildPathAlertQuoteCandidatesFromConfig()` 改走共享候选工具
  - `path-alerts-app.js` 的 fallback `buildQuoteCandidates()` 改走共享候选工具
  - `app.js` 的 `buildPriceSnapshotPayload()` 改走共享快照工具

- [ ] **Step 4: 重新运行相关测试并确认转绿。**
  Run: `node tests/queue-stats-utils.test.js && node tests/path-alert-candidate-utils.test.js && node tests/path-alerts-app-fallback.test.js && node tests/path-alert-candidates-api.test.js && node tests/price-snapshot-payload-utils.test.js && node tests/static-server.test.js`
  Expected: PASS

- [ ] **Step 5: 提交这一小步。**
  Run: `git add path-alert-candidate-utils.js price-snapshot-payload-utils.js index.html path-alerts.html queue-stats-utils.js server.js path-alerts-app.js app.js tests/queue-stats-utils.test.js tests/path-alert-candidate-utils.test.js tests/path-alerts-app-fallback.test.js tests/path-alert-candidates-api.test.js tests/price-snapshot-payload-utils.test.js tests/static-server.test.js && git commit -m "feat: filter paused quotes in consumers"`

## Chunk 2: 主看板暂停/恢复交互与运行态切换

### Task 3: 先锁定主看板暂停后的运行态语义

**Files:**
- Modify: `tests/quote-pause-utils.test.js`
- Modify: `quote-pause-utils.js`

- [ ] **Step 1: 写失败测试，补充暂停运行态的细节约束。**
  - `buildPausedQuoteState()` 会清掉 `lastRawPrice` / `lastResultText` / `inverseRawPrice` / `usedSource` / `hasUnreadAlert` / `logShown`
  - 但保留 `fromSymbol` / `toSymbol`
  - 如之前无 symbol，也不强造 symbol

- [ ] **Step 2: 运行测试，确认先失败。**
  Run: `node tests/quote-pause-utils.test.js`
  Expected: FAIL，新增字段断言未满足

- [ ] **Step 3: 只补足共享工具中的运行态清理逻辑。**
  - 不提前改 UI
  - 让 app 侧后续可直接复用这一份 paused state 结果

- [ ] **Step 4: 重新运行测试并确认转绿。**
  Run: `node tests/quote-pause-utils.test.js`
  Expected: PASS

- [ ] **Step 5: 提交这一小步。**
  Run: `git add quote-pause-utils.js tests/quote-pause-utils.test.js && git commit -m "feat: finalize paused runtime cleanup"`

### Task 4: 接上主看板按钮、队列和报警/路径联动

**Files:**
- Modify: `app.js`
- Modify: `index.html`

- [ ] **Step 1: 先补一个最小失败验证，锁定 `app.js` 中暂停入口必须存在。**
  - 在 `tests/static-server.test.js` 中新增断言，要求 `app.js` 返回内容包含暂停按钮数据属性（如 `data-toggle-pause-id`）、暂停态文案 `已暂停`，以及暂停态 class/hook 入口

- [ ] **Step 2: 运行相关测试并确认先失败。**
  Run: `node tests/static-server.test.js`
  Expected: FAIL，`app.js` 还没有暂停入口或暂停态文案
- [ ] **Step 3: 在 `app.js` 中接入暂停/恢复按钮与点击处理。**
  - 交易对操作区在设置按钮左侧新增暂停/恢复按钮
  - 在 `index.html` 的主看板样式里增加暂停态灰化 class/选择器
  - 切换 `quote.paused`
  - 暂停时移出队列、abort 活跃请求、用 `buildPausedQuoteState()` 覆盖运行态、清掉反向报价 DOM、清掉 loading/error/highlight 样式、触发路径重算和报警重评估、保存配置
  - 恢复时重新入队、更新样式、立即触发一次主向报价、保存配置

- [ ] **Step 4: 让主看板所有 active quote 消费点统一过滤暂停项。**
  - 初始化入队只处理活跃交易对
  - `addToQueue()` / `processQueue()` / 相关遍历跳过暂停项
  - 套利路径、规则报警、路径报警求值上下文统一只看活跃交易对
  - 直接报价报警在暂停后不再继续触发

- [ ] **Step 5: 运行相关自动化测试。**
  Run: `node tests/quote-pause-utils.test.js && node tests/path-alert-candidate-utils.test.js && node tests/price-snapshot-payload-utils.test.js && node tests/queue-stats-utils.test.js && node tests/path-alert-candidates-api.test.js && node tests/static-server.test.js`
  Expected: PASS

- [ ] **Step 6: 做手工 smoke check，验证 UI 与联动。**
  - 启动：`npm start`
  - 在浏览器打开主看板和右侧套利路径面板
  - 在设置里先开启 price snapshot，并把周期设为 `10s`
  - 对一个已有报价和名字的交易对点击暂停，确认：
    - 无确认弹窗
    - 名字保留
    - 价格区变 `已暂停`
    - 整行置灰
    - 反向报价消失
    - 右侧套利路径面板中的相关机会消失或重算
    - 该交易对自身报警不再继续触发
    - 等待一轮快照周期后，在图表页或 `db/price` 最新快照中确认不再写入该交易对的新点
  - 再点击恢复，确认重新报价
  - 观察恢复后主看板价格重新出现，右侧套利路径面板重新纳入该交易对

- [ ] **Step 7: 运行完整回归并确认通过。**
  Run: `npm test`
  Expected: exit 0

- [ ] **Step 8: 提交实现。**
  Run: `git add app.js index.html quote-pause-utils.js tests/quote-pause-utils.test.js tests/static-server.test.js && git commit -m "feat: add quote pause workflow"`
