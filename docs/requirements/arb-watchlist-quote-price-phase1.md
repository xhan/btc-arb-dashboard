# 关注列表第一期需求文档：只支持交易对价格

## 目标

第一期只解决一个简单问题：

在套利路径面板的关注列表里，手动配置几个交易对价格关注项，并能看到它们当前已经计算好的价格。

第一期不处理 fixed path，不处理 special rule，不迁移整个套利路径系统。
第一期也不处理“是否触发报警”。

## 范围

### 本期要做

- 新增纯配置文件 `arb-path-config.js`。
- 配置文件里只放交易对价格关注项。
- 关注列表只显示 `arb-path-config.js` 里配置的交易对。
- 配置里用 `quoteId` 指向现有交易对。
- 配置里用注释标明对应交易对信息，例如 `// Avalanche USDe/USDT`。
- 卡片 title 使用配置里设置的 title。
- UI 使用专门的交易对关注卡片，不复用普通套利路径卡片硬凑。

### 本期不做

- 不把 fixed path 配进 `arb-path-config.js`。
- 不把 special rule 配进 `arb-path-config.js`。
- 不改全局路径。
- 不重构完整报警系统。
- 不在第一期判断是否触发报警。
- 不在第一期展示触发状态、冷却状态、待确认状态。
- 不在 `arb-path-config.js` 里复制老的报警配置。
- 不自动扫描 `alert.json` 生成关注列表。
- 不更新 `docs/plans/2026-04-16-cpu-and-simplification-todo.md`。

## 配置设计

`arb-path-config.js` 必须是纯配置文件。

示例：

```js
window.ArbPathConfig = {
  watchItems: [
    // Avalanche USDe/USDT
    {
      title: 'Avalanche USDe -> USDT',
      type: 'quote-price',
      quoteId: 123,
      direction: 'forward'
    }
  ]
};
```

字段说明：

- `title`：关注卡片显示名称。
- `type`：第一期固定为 `quote-price`。
- `quoteId`：对应现有交易对配置里的 quote id。
- `direction`：`forward` 或 `inverse`，只用于内部选择价格，不在 UI 上单独展示。

第一期不在 `arb-path-config.js` 里配置报警条件。

## 代码边界

### `arb-path-config.js`

只放配置。

不能放：

- normalize 函数
- lookup 函数
- evaluate 函数
- UI 渲染函数
- migration 逻辑

### `arb-path-config-utils.js`

新增工具文件，负责：

- 读取 `window.ArbPathConfig.watchItems`
- 校验配置
- 把配置转换成程序内部结构
- 根据 `quoteId + direction` 读取当前价格所需的字段

### `app.js`

只负责接线：

- 读取 normalized watch items
- 计算当前价格状态
- 把关注项传给 renderer

### `arb-panel-renderer.js`

新增专门的 quote watch card 渲染。

不要把交易对关注项伪装成套利 cycle。

## UI 设计

关注列表里的交易对卡片应该是紧凑信息卡。

布局示例：

```text
Avalanche USDe -> USDT
当前价格 1.00042
Avalanche · USDe/USDT
```

状态文案只保留数据可用性：

- `等待报价`
- `报价暂停`

视觉要求：

- 不要只堆多行普通文本。
- 标题、当前价格、链和交易对信息要有明确层次。
- 等待报价、报价暂停状态用灰色弱化。
- 不展示正向/反向文案，因为 price 已经是选定方向对应的价格。
- 不展示是否触发报警。

## 数据流

第一期数据流：

```text
arb-path-config.js
  -> arb-path-config-utils.js normalize
  -> app.js 获取 quote 当前价格
  -> arb-panel-renderer.js 渲染关注卡片
```

## 与 `alert.json` 的关系

第一期不再让关注列表自动读取 `alert.json`。

第一期的原则：

- 配在 `arb-path-config.js` 里的交易对，才显示在关注列表。
- 没配在 `arb-path-config.js` 里的交易对，即使 `alert.json` 里有报警，也不显示在关注列表。
- 老的交易对报警继续由 `alert.json` 和现有代码负责，不迁移、不复制、不改行为。
- `arb-path-config.js` 第一阶段只做关注列表展示配置，不做报警配置主源。

这样可以避免同一个交易对报警在两个地方配置，造成阈值不一致。

后续如果要把报警也收敛进 `arb-path-config.js`，必须单独设计迁移规则：

- 要么 `arb-path-config.js` 成为报警唯一配置源，并生成运行时报警配置。
- 要么保留 `alert.json` 为报警源，`arb-path-config.js` 只引用 alert id。
- 不能长期让两边都各自配置一份真实报警条件。

这个迁移不属于第一期。

## 验收标准

- `arb-path-config.js` 是纯配置文件。
- 关注列表只显示 `arb-path-config.js` 显式配置的交易对。
- 不配置交易对时，关注列表为空或显示明确空状态。
- 配置一个交易对后，关注列表出现一张专门的交易对关注卡片。
- 卡片使用配置里的 title。
- 卡片能显示当前价格，以及链和交易对信息。
- 卡片不展示正向/反向。
- 卡片不展示是否触发报警。
- 老的交易对报警仍按现有 `alert.json` 逻辑工作。
- 页面刷新后配置仍然生效。
- 不更新 `docs/plans/2026-04-16-cpu-and-simplification-todo.md`。
