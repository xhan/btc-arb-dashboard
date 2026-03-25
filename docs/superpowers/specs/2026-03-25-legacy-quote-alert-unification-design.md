# Legacy Quote Alert Unification Design

## 背景

当前项目里存在两套报警体系：

1. 老的单报价“监控与提醒”
   - 配置入口在单报价弹窗
   - 触发时机是报价返回后立即判断
   - 命中后会持续播放 `alert.mp3`
   - 没有 `delayed` / `cooldown`
   - 远程推送是后来补接到老逻辑上的

2. 新的路径报警系统
   - 配置入口在路径报警管理页
   - 使用统一 runtime 状态机
   - 支持 `immediate` / `delayed` / `cooldown`
   - 使用 `alert_path.mp3`
   - 远程推送、日志、状态展示都更完整

用户目标是：

- 老的“价格达到 xx” / “相对基准涨跌 xx%”规则，继续保留现有配置入口
- 这类规则的实际触发行为完全切换到新报警机制
- 不再保留“命中后一直响”的老行为，改为走新系统的 `cooldown`
- 在新的报警管理页中，也能看到并编辑这类规则
- 报警判定仍然保持最实时，不退化为独立轮询的 1000ms 扫描

## 非目标

- 本次不移除老弹窗入口
- 本次不把单报价规则硬塞进“路径 legs”模型
- 本次不要求把所有 UI 文案立即完全统一
- 本次不改路径报警已有的 `path` / `rule` 语义

## 设计结论

### 1. 新增第三类报警目标：`quote`

在 `alert.config` 中新增 `target.type = "quote"`。

结构示意：

```json
{
  "id": "quote-alert-101-target-above",
  "name": "BSC BTCB/syBTC 价格高于",
  "enabled": true,
  "triggerMode": "delayed",
  "confirmDelaySec": 5,
  "cooldownSec": 180,
  "delivery": {
    "sound": true,
    "log": true,
    "webhookEnabled": false
  },
  "target": {
    "type": "quote",
    "quoteId": 101,
    "ruleKind": "targetAbove",
    "value": 0.100113
  }
}
```

百分比规则示意：

```json
{
  "id": "quote-alert-101-percent-up",
  "name": "BSC BTCB/syBTC 上涨提醒",
  "enabled": true,
  "triggerMode": "immediate",
  "confirmDelaySec": 0,
  "cooldownSec": 180,
  "delivery": {
    "sound": true,
    "log": true,
    "webhookEnabled": false
  },
  "target": {
    "type": "quote",
    "quoteId": 101,
    "ruleKind": "percentUp",
    "value": 0.1,
    "basePrice": 0.1
  }
}
```

字段定义：

- `target.quoteId`
  - 对应主看板中的单条报价
- `target.ruleKind`
  - `targetAbove`
  - `targetBelow`
  - `percentUp`
  - `percentDown`
- `target.value`
  - 价格阈值或百分比阈值
- `target.basePrice`
  - 仅 `percentUp` / `percentDown` 使用

说明：

- `quote` 目标不复用 `thresholdBp`
- `quote` 的阈值语义直接存进 `target.value`
- 这样 `path` / `rule` / `quote` 三类目标边界明确，避免后续维护混乱

### 2. 运行时采用“事件驱动 + 新状态机”

`quote` 报警不并入路径报警当前的独立 `setInterval` 扫描器。

原因：

- 老单报价报警最大的价值是“报价一返回就立刻判断”
- 如果并进 `pathAlertEvalIntervalMs = 1000ms`，会天然慢一拍
- 用户明确要求最实时的报警

因此运行时策略为：

1. `fetchSingleQuote()` 返回新报价
2. 立即收集这条 `quoteId` 关联的全部 `quote` 报警
3. 用统一的评估函数判断每条 `quote` 报警当前是否命中
4. 调用现有新报警 runtime 状态推进逻辑
5. 只有 runtime 判定 `shouldTrigger = true` 时才真正报警

报警动作统一为：

- 播放 `alert_path.mp3`
- 写提醒日志
- 并行远程推送

不再使用：

- 老 `alert.mp3`
- 老 `hasUnreadAlert/logShown` 作为真实报警状态机

### 3. 复用新报警已有能力

`quote` 报警接入后，以下行为统一走新系统：

- `triggerMode = immediate / delayed`
- `confirmDelaySec`
- `cooldownSec`
- 日志
- 远程推送
- 音效

具体语义：

- `immediate`
  - 当前报价一返回且命中条件，就立即报警
- `delayed`
  - 第一次命中后进入观察
  - 连续满足到 `confirmDelaySec` 后才报警
- `cooldown`
  - 报警后进入冷却
  - 冷却期内，即使仍然命中，也不重复报警

这正是用户希望替代老逻辑“一直响、一直维持报警态”的核心行为。

### 4. 老入口保留，新管理页也支持配置

配置入口保留两处：

1. 老的单报价“监控与提醒”弹窗
2. 新的路径报警管理页

设计原则：

- 双入口
- 单真相源

单真相源定义为：

- 运行时真实配置只认 `alert.config`

老弹窗保存时：

- 不再把 `quote.alerts` 当成运行时真相
- 而是把每一项规则映射成对应的 `quote` 报警，写入 `alert.config`

新管理页编辑时：

- 新增“报价规则”来源或类型
- 能查看 / 编辑 / 启停这类 `quote` 报警

### 5. 稳定 ID 方案

每条单报价规则使用稳定 ID，避免重复生成：

- `quote-alert-<quoteId>-target-above`
- `quote-alert-<quoteId>-target-below`
- `quote-alert-<quoteId>-percent-up`
- `quote-alert-<quoteId>-percent-down`

这样可保证：

- 老弹窗多次保存时是覆盖更新，而不是越存越多
- 新管理页编辑后也能稳定回填到老弹窗

### 6. 基准价语义保持老规则

`basePrice` 的更新语义保持老逻辑，不重新定义：

- 只有用户保存时勾选“更新基准价格为当前价格”
  - 才用当前最新 `lastRawPrice` 重置 `basePrice`
- 如果没勾选，且旧值存在
  - 就沿用旧值
- 如果保存时还没有有效当前价格
  - 不强行写入 `basePrice`

这样可以避免用户原有“百分比提醒”认知被打破。

### 7. 声音和远程推送统一

`quote` 报警命中后统一使用：

- `alert_path.mp3`
- 现有新报警远程推送接口

远程推送保持并行发送：

- Telegram
- day.app

发送失败不阻塞其他通道，也不影响本地日志和音效。

### 8. 旧状态字段的处理

老的这些字段不再承担核心报警职责：

- `hasUnreadAlert`
- `logShown`
- `isSoundActive`

处理原则：

- 运行时真正的触发节奏由新 runtime 决定
- 老字段只保留最小兼容职责，直到相关 UI 迁移完成
- 后续可以逐步删除，但本次不要求一次性删干净

### 9. 兼容迁移策略

为避免旧用户配置丢失，采用兼容迁移：

1. 启动或加载配置时扫描旧 `quote.alerts`
2. 将其归一化为 `quote` 报警
3. 写入或合并到 `alert.config`
4. 若对应稳定 ID 已存在，则更新，不重复创建

兼容期内：

- 老弹窗展示优先读新 `quote` 报警
- 如果没有，再 fallback 到旧 `quote.alerts`

收口后：

- 旧 `quote.alerts` 不再作为运行时真相源
- 只保留过渡兼容与 UI 回填

## 组件拆分

### `path-alert-utils.js`

负责扩展：

- `target.type = "quote"` 的归一化
- `quote` 报警评估函数
- 让现有 runtime 状态推进逻辑可复用在 `quote` 目标上

### `app.js`

负责：

- 在 `fetchSingleQuote()` 返回后实时驱动 `quote` 报警评估
- 老弹窗保存时与 `alert.config` 同步
- 老弹窗读取时优先回填新 `quote` 报警
- 统一使用路径报警音效和远程推送链路

### `path-alerts-app.js`

负责：

- 在管理页中展示 / 创建 / 编辑 `quote` 报警
- 将其和已有 `path` / `rule` 目标一起纳入同一管理面板

### `server.js`

原则上不需要新增远程推送接口：

- 继续复用 `/api/send-path-alert-webhook`

只有在配置迁移或读取流程需要服务端辅助时，才做小幅补充。

## 数据流

### 1. 老弹窗保存

1. 用户打开单报价“监控与提醒”
2. 编辑价格阈值 / 百分比阈值 / 基准价
3. 选择新系统参数：
   - 立即 / 延迟
   - 延迟确认秒数
   - 冷却秒数
4. 保存
5. 前端把这些值映射成对应 `quote` 报警并持久化到 `alert.config`

### 2. 报价实时触发

1. 单报价刷新成功
2. 找出该 `quoteId` 绑定的所有 `quote` 报警
3. 评估当前价格 / 总价是否命中
4. 用统一 runtime 推进状态
5. 若 `shouldTrigger = true`
   - 记录日志
   - 播放 `alert_path.mp3`
   - 并行远程推送

### 3. 管理页编辑

1. 用户在管理页编辑 `quote` 报警
2. 保存到 `alert.config`
3. 老弹窗下次打开时，从对应稳定 ID 回填展示

## 错误处理

- 找不到 `quoteId`
  - 标记为 `unavailable`
  - 不触发报警
- `basePrice` 缺失但规则是百分比类型
  - 标记为 `unavailable`
  - 管理页和弹窗应展示原因
- 远程推送失败
  - 只记控制台错误
  - 不阻塞本地报警
- 报价短暂不可用
  - runtime 回到 `unavailable`
  - 不保留错误触发态

## 测试重点

### 1. `quote` 目标归一化

- 支持四类 `ruleKind`
- `basePrice` 仅在百分比规则中有效

### 2. 实时触发

- 报价一返回即评估
- 不依赖独立 `1000ms` 轮询

### 3. 新状态机

- `immediate` 立即触发
- `delayed` 延迟确认
- `cooldown` 内不重复触发
- 冷却结束后若仍命中，可再次触发

### 4. 双入口同步

- 老弹窗保存后，新管理页可见
- 新管理页编辑后，老弹窗可正确回填

### 5. 迁移

- 旧 `quote.alerts` 能稳定迁移成新 `quote` 报警
- 重复加载不会重复创建规则

### 6. 音效与远程推送

- `quote` 报警使用 `alert_path.mp3`
- 远程推送继续走并行发送

## 风险与约束

最大风险不在触发本身，而在“双入口同步”：

- 老弹窗字段是按单报价聚合展示
- 新管理页是按单条报警记录展示

因此实现时必须保证：

- 聚合展示与拆分存储之间的映射是稳定且可逆的
- 同一个 `quoteId + ruleKind` 只能对应一条真实报警

否则很容易出现：

- 老弹窗改了一次，管理页多出重复规则
- 或管理页改完后，老弹窗展示错位

## 最终建议

本次改造采用：

- 双入口
- 单真相源
- 事件驱动
- 新状态机统一接管

这是兼顾用户习惯、实时性和后续维护成本的最优折中。
