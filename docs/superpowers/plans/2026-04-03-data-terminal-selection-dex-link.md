# Data Terminal Selection And Dex Link Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为数据终端增加左右列单选、顶部组合收益 bp 显示，以及与套利路径复用的按需复制 dex URL 能力。

**Architecture:** 数据终端保持现有按需挂载和节流重算模型，只额外维护每列一个选中 key，并在渲染时计算顶部组合收益。dex URL 不预计算；抽出一个通用 dex-link helper，由套利路径和数据终端在用户点击复制时即时生成并复制，避免列表刷新时的额外开销。

**Tech Stack:** 原生 JavaScript、现有 `app.js` 浮层渲染逻辑、现有 utils 模块模式、Node `assert` 测试

---

## Chunk 1: Dex Link Reuse

### Task 1: 抽出通用 dex-link helper

**Files:**
- Create: `/Users/xhan/Desktop/market_diff/dex-link-utils.js`
- Modify: `/Users/xhan/Desktop/market_diff/arb-detail-utils.js`
- Modify: `/Users/xhan/Desktop/market_diff/index.html`
- Test: `/Users/xhan/Desktop/market_diff/tests/dex-link-utils.test.js`
- Test: `/Users/xhan/Desktop/market_diff/tests/arb-detail-utils.test.js`
- Test: `/Users/xhan/Desktop/market_diff/tests/static-server.test.js`

- [ ] **Step 1: 写失败测试，锁定通用 dex-link helper 行为**

```js
const assert = require('assert');
const { buildDexLink } = require('../dex-link-utils');

assert.deepStrictEqual(
  buildDexLink({
    chain: 'ethereum',
    fromTokenAddress: '0xfrom',
    toTokenAddress: '0xto',
    inputAmount: 1
  }),
  {
    label: 'swap.defillama',
    url: 'https://swap.defillama.com/?chain=ethereum&from=0xfrom&tab=swap&to=0xto'
  }
);
```

- [ ] **Step 2: 运行测试，确认红灯**

Run: `node tests/dex-link-utils.test.js`
Expected: FAIL，提示 `Cannot find module '../dex-link-utils'`

- [ ] **Step 3: 写最小实现**

```js
function buildDexLink(config = {}) {
  // 从 arb-detail-utils.js 搬出链路构造逻辑
}
```

要求：
- 兼容现有链路规则：`sui / solana / starknet / 其他 EVM / bybit / binance`
- 只返回 `{ label, url } | null`
- 不做复制，不做 DOM 操作

- [ ] **Step 4: 让 arb-detail-utils.js 复用新 helper**

实现方式：
- 在 `arb-detail-utils.js` 顶部引入/获取 `DexLinkUtils`
- 保留 `buildArbDetailDexLink` 这个对外接口，内部委托给 `buildDexLink`
- 不改现有调用方签名，先保持兼容

- [ ] **Step 5: 更新静态脚本顺序测试**

要求：
- `index.html` 在 `arb-detail-utils.js` / `app.js` 可用之前引入 `dex-link-utils.js`
- `tests/static-server.test.js` 断言新脚本已注入

- [ ] **Step 6: 跑相关测试，确认绿灯**

Run: `node tests/dex-link-utils.test.js && node tests/arb-detail-utils.test.js && node tests/static-server.test.js`
Expected: PASS


## Chunk 2: Data Terminal Selection

### Task 2: 先写数据终端单选和 bp 计算测试

**Files:**
- Modify: `/Users/xhan/Desktop/market_diff/data-terminal-utils.js`
- Modify: `/Users/xhan/Desktop/market_diff/tests/data-terminal-utils.test.js`

- [ ] **Step 1: 为选中 key 和 bp 计算写失败测试**

```js
const { buildDataTerminalSelectionSummary } = require('../data-terminal-utils');

assert.deepStrictEqual(
  buildDataTerminalSelectionSummary(
    { leftKey: 'left-1', rightKey: 'right-1' },
    [
      { key: 'left-1', rate: 1.00123 },
      { key: 'right-1', rate: 0.99991 }
    ]
  ),
  { text: '+1.40bp', value: 1.4 }
);
```

覆盖点：
- 左右各一条时计算 `((left.rate * right.rate) - 1) * 10000`
- 保留 2 位小数
- 任一侧未选中时返回空态
- 已选 key 在最新 rows 中消失时可被上层清理

- [ ] **Step 2: 运行测试，确认红灯**

Run: `node tests/data-terminal-utils.test.js`
Expected: FAIL，提示缺少新导出或断言不匹配

- [ ] **Step 3: 在 data-terminal-utils.js 增加纯函数**

建议新增：
- `formatDataTerminalBp(value)`
- `buildDataTerminalSelectionSummary(selectionState, rowsByKey)`

要求：
- 纯函数，不依赖 DOM
- 输出 `{ text, value }` 或等价空态对象

- [ ] **Step 4: 跑纯函数测试，确认绿灯**

Run: `node tests/data-terminal-utils.test.js`
Expected: PASS


### Task 3: 接入数据终端单选、顶部 bp 显示和更紧凑控制区

**Files:**
- Modify: `/Users/xhan/Desktop/market_diff/app.js`
- Modify: `/Users/xhan/Desktop/market_diff/index.html`
- Test: `/Users/xhan/Desktop/market_diff/tests/static-server.test.js`

- [ ] **Step 1: 扩展 dataTerminalState**

增加：
- `selectedLeftKey`
- `selectedRightKey`

关闭浮层时不强制清空；但渲染时如果对应 row 已不存在，要自动清掉失效选择。

- [ ] **Step 2: 调整顶部控制区布局**

要求：
- 缩短搜索输入框宽度
- 在搜索区最右侧新增收益位，例如 `#data-terminal-profit-bp`
- 无有效组合时显示 `--` 或空态文本，保持布局稳定

- [ ] **Step 3: 调整行渲染结构**

要求：
- 每行带稳定 `data-row-key`
- 行点击只负责选中/取消
- 左列、右列各自维护独立单选
- 选中态有明显样式（边框/背景即可，不做复杂动画）

- [ ] **Step 4: 在 renderDataTerminalPanel 中接入选择同步**

实现要点：
- 基于当前 viewModel 的 `leftRows/rightRows` 建立 key 集
- 如果当前选中 key 已不存在，清空对应列选中
- 调用 `buildDataTerminalSelectionSummary` 更新顶部 bp

- [ ] **Step 5: 补静态测试**

断言点：
- 顶部收益位容器存在
- 数据终端行具备可选中样式/标识
- `app.js` 包含单选状态字段和 bp 计算入口

- [ ] **Step 6: 运行测试，确认绿灯**

Run: `node tests/data-terminal-utils.test.js && node tests/static-server.test.js`
Expected: PASS


## Chunk 3: On-demand Copy Dex URL

### Task 4: 给套利路径和数据终端接入按点击复制 dex URL

**Files:**
- Modify: `/Users/xhan/Desktop/market_diff/app.js`
- Modify: `/Users/xhan/Desktop/market_diff/index.html`
- Test: `/Users/xhan/Desktop/market_diff/tests/static-server.test.js`

- [ ] **Step 1: 把 app.js 中已有复制逻辑整理成可复用 helper**

建议新增：
- `buildQuoteDexLinkPayload(rowOrQuote)`
- `copyDexLinkForRow(rowOrQuote)`

要求：
- 点击时才调用 `buildDexLink(...)`
- 复制失败时沿用现有 toast / console warning 风格
- 不在数据终端渲染阶段预计算 URL

- [ ] **Step 2: 保持套利路径复制入口走新 helper**

要求：
- 现有套利路径复制行为不回退
- 删除重复的 URL 组装逻辑

- [ ] **Step 3: 给数据终端每行增加复制按钮**

交互要求：
- 按钮点击不触发行选中
- 复制后给出与现有复制动作一致的反馈
- `bybit/binance` 等无 dex URL 的行按钮可禁用或点击提示不可用

- [ ] **Step 4: 跑回归测试**

Run: `node tests/static-server.test.js && node tests/arb-detail-utils.test.js && node tests/dex-link-utils.test.js`
Expected: PASS


## Chunk 4: Full Verification

### Task 5: 做完整回归并检查无关文件未混入

**Files:**
- Verify only: `/Users/xhan/Desktop/market_diff/config.json`

- [ ] **Step 1: 跑完整测试**

Run: `npm test`
Expected: PASS，仅允许现有已知 warning

- [ ] **Step 2: 跑语法检查**

Run: `node -c app.js && node -c data-terminal-utils.js && node -c dex-link-utils.js`
Expected: PASS

- [ ] **Step 3: 核对工作区**

Run: `git status --short`
Expected:
- 只包含这次功能相关文件
- `/Users/xhan/Desktop/market_diff/config.json` 仍保持为无关本地修改，不进暂存区

- [ ] **Step 4: 准备提交**

```bash
git add app.js index.html data-terminal-utils.js dex-link-utils.js arb-detail-utils.js \
  tests/data-terminal-utils.test.js tests/dex-link-utils.test.js tests/static-server.test.js
git commit -m "feat: add data terminal pair selection and dex link copy"
```
