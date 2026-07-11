# ADR-0001：套利发现与报警评估共享 Snapshot

## 状态

已接受，2026-07-11。

## 背景

此前 topology cache、规则 snapshot 和 muted-leg 投影由套利看板控制器持有。报价变化后，看板与报警分别调度，报警同时保留 1 秒评估循环。虽然 cache 避免了多数重复搜索，但仍存在 UI 所有权倒置、重复遍历、延迟确认最多额外等待一个轮询周期，以及看板与报警失效顺序不一致的问题。

固定规则和特殊规则的 id、标题也同时维护在规则定义与看板 watch item 中，新增规则时容易发生配置漂移。

## 决策

1. 新增独立 `ArbDiscovery` module，拥有 topology cache、规则 snapshot 和 muted-leg 投影。
2. `ArbDiscovery.getSnapshot()` 生成供规则报警和看板共同使用的规则 snapshot；看板可见时再通过 `getPanelSnapshot()` 基于该 snapshot 按需补充全局路径投影。
3. 报价变化继续使用 500ms 合并窗口。窗口结束时先取得 snapshot，再立即评估规则报警，并仅在看板可见时渲染 DOM。
4. 手工路径报警只在相关报价腿变化时计算，报价报警继续由单个报价更新直接触发。
5. 删除固定 1 秒报警扫描。延迟确认与冷却由最近截止时间 timer 驱动。
6. 固定规则和特殊规则的 watch item 从 `path-alert-rule-definitions.js` 派生。`config/alert.js` 只保存用户报警运行配置。

## 结果

- 每个 market revision 和 muted-leg 状态组合至多生成一次规则 snapshot。
- 看板隐藏但规则报警启用时，套利发现继续运行；两者都无需求时不执行昂贵计算。
- muted-leg 变化进入 snapshot cache key，只重新计算行情投影，不重建 topology。
- 延迟报警按截止时间检查，不再承担固定轮询的 CPU 消耗和最多 1 秒附加延迟。
- 看板渲染、报警通知和套利发现保持独立职责，但共享同一个计算 seam。
