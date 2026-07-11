# 项目领域上下文

## 核心术语

- **行情状态（Market State）**：报价请求产生的价格、方向、symbol 和可用状态。只有行情实际变化才推进 market revision。
- **套利发现（Arbitrage Discovery）**：根据行情状态、套利规则和屏蔽腿生成套利 snapshot 的过程，不包含 DOM 渲染和通知发送。
- **套利 Snapshot**：同一 market revision 下供套利看板、规则报警和详情共同消费的不可变计算结果。
- **规则报警（Rule Alert）**：以固定规则或特殊规则为目标，直接消费套利 snapshot 的报警。
- **手工路径报警（Manual Path Alert）**：以用户选定的报价腿为目标，在相关报价变化时重新计算，不执行套利路径搜索。
- **报价报警（Quote Alert）**：以单个报价方向为目标，直接由报价更新触发。
- **规则定义（Rule Definition）**：固定规则和特殊规则的唯一静态定义，包含 id、标题和发现参数。
- **报警运行配置（Alert Runtime Config）**：通过 ruleId 或 quoteId 关联目标的用户设置，包括开关、阈值、确认延迟和冷却时间。

## 关键约束

- 套利看板和规则报警必须消费同一个套利 snapshot，不能分别搜索路径。
- 看板隐藏只停止 DOM 渲染；存在启用中的规则报警时，套利发现仍需运行。
- UI 筛选状态不能改变套利 snapshot，也不能推进 market revision。
- 延迟确认和冷却使用最近截止时间 timer，不使用固定间隔扫描。
- 固定规则和特殊规则的 watch item 从规则定义派生；报警运行配置保持独立并通过 ruleId 关联。
