# CPU 与结构简化 Todo List

> 讨论版清单：先按优先级确认，再逐项实施。

## P0 立即处理

### 1. 后端请求配置缓存
- 目标：去掉高频报价接口里的重复读文件、JSON 解析和 request-channel 归一化。
- 现状：
  - 已新增 `runtimeConfigCache`，`buildQuoteRequestInput()` 通过缓存读取 request-channel 配置
  - `config.json`、`config_more.json`、`request_channels.json` 只在启动、`/api/request-update-config`、`/api/save-config` 后重读并归一化
  - `tests/request-channels-api.test.js` 已覆盖 `/api/save-config` 后缓存刷新
- 预期收益：
  - 已降低高频报价接口的 Node CPU 和磁盘 IO
  - 已降低 request-channel 归一化带来的尾延迟
- 后续建议：
  - 如果后续新增请求通道保存接口，也必须调用 `refreshRuntimeConfigCache()`

### 2. 套利面板隐藏时停止重算
- 目标：套利大盘不可见时不再做全量路径重算和整块 DOM 重建。
- 现状：
  - 每次主报价成功都会 `scheduleArbUpdate()`
  - `updateArbPanel()` 会全量构建 `buildArbPanelData()` 并 `innerHTML` 重建
  - `scheduleArbUpdate()` 调度前会检查面板可见性；timer 触发时也重新走 `updateArbPanel()` 的可见性保护
  - 面板隐藏时只标记 dirty，不再被已排队 timer 强制全量重算
- 预期收益：
  - 明显降低前端主线程 CPU
  - 减少由报价更新触发的大对象构建和字符串拼接
- 建议改法：
  - 已引入“面板是否可见”判定
  - 已做到隐藏时只标记 dirty，不立即重算
  - 已做到再次打开面板时补做一次最新重算

### 3. 路径报警无任务时停表
- 目标：没有有效路径报警时不跑 1s 评估循环。
- 现状：
  - `restartPathAlertScheduler()` 会直接启动 `setInterval`
  - `evaluatePathAlertsOnce()` 每次都取共享套利快照并做完整评估
  - 报警面板是否打开不影响这套计算
- 预期收益：
  - 降低前端持续 CPU 占用
  - 降低套利快照被高频消费的频率
- 建议改法：
  - 没有非 quote 类型 alert 时不启动路径报警轮询
  - 只有新增相关 alert 时再启动
  - 保留 quote alert 的独立判断链路

### 4. 套利详情刷新从“死循环”改成“受控轮询”
- 目标：避免详情弹窗打开后无间隔连续刷新。
- 现状：
  - 已移除 `startArbDetailLoop()` 内的长期 `while (...)` 循环
  - 详情刷新改为单次刷新完成后用 `setTimeout` 调度下一轮，并在关闭/重启时清理 timer
  - 调度状态机已下沉到 `arb-detail-refresh-utils.js`，`app.js` 只保留业务回调和生命周期入口
  - 每轮仍会对每张卡片、每条腿串行请求；详情仍可能同步更新主报价状态
- 预期收益：
  - 同时降低前端和后端 CPU
  - 明显降低详情页打开时的请求风暴
- 建议改法：
  - 已改成 2.5s 固定间隔轮询
  - 图表刷新和详情报价刷新共用预算，不双重拉取

## P1 高优先级

### 5. 把行情状态和 UI 状态拆开
- 目标：避免 UI 变化误伤套利缓存。
- 现状：
  - 已新增独立 `quoteUiState`，趋势箭头 timer、未读报警等 UI-only 字段不再写入 `quoteMarketState`
  - `quoteUiState` 已移除旧 `logShown` / quote 级 `isSoundActive` 运行时字段，边界层仅保留对这些旧字段的过滤兼容
  - `setQuoteMarketState()` 会净化行情状态，避免 UI 字段重新混入市场状态 Map
  - `quote-pause-utils.buildPausedQuoteState()` 已停止输出 UI-only 字段
  - 已新增 market-state signature，`setQuoteMarketState()` 只在市场字段变化时推进套利/数据终端 revision
- 预期收益：
  - 已减少 UI-only 更新导致的不必要套利缓存失效
  - 继续降低前端重复计算
- 后续建议：
  - 保持只有行情字段变更时才失效套利缓存
  - 后续拆 `app.js` 时把 `quoteMarketState` / `quoteUiState` 放入各自模块边界

### 6. 减少整块 `innerHTML` 重建
- 目标：减少大面板反复全量重绘。
- 现状：
  - 套利面板、路径报警面板、数据终端都大量依赖 `innerHTML`
  - 已抽出 `dom-render-utils.js` 的 stable HTML renderer；套利面板、路径报警面板、muted 状态面板和数据终端在生成结果完全一致时跳过 `innerHTML` 替换
  - 数据量一大时，字符串构建和节点替换成本高
- 预期收益：
  - 降低前端渲染抖动
  - 提升交互稳定性
- 建议改法：
  - 已先从套利面板、路径报警面板、muted 状态面板和数据终端做最小重绘保护
  - 路径报警面板已保持“仅在可见时刷新”
  - 数据终端已完成 records/candidates 缓存

### 7. 数据终端缓存化
- 目标：避免每次刷新都重建 records 和 candidates。
- 现状：
  - 已用 `dataTerminalRecordsCacheKey` 缓存 `dashboardState + quoteMarketState` 生成的 records
  - 已用同一 cache key 缓存 candidates，查询、别名、diff 变化只重跑 view model/filter
- 预期收益：
  - 已降低数据终端打开后的持续 CPU
- 后续建议：
  - 若数据量继续增长，再对数据终端 DOM 做局部更新

### 8. sqlite 连接与 schema 初始化下沉
- 目标：减少后端图表/快照接口的重复初始化成本。
- 现状：
  - `price-snapshot-store.js` 仍按调用打开/关闭 DB
  - 已增加 per-dbPath schema-ready 缓存，避免每次调用重复执行 `ensureSchema()`
- 预期收益：
  - 降低 Node CPU 和重复 schema 初始化成本
  - 降低图表预览自动刷新带来的额外成本
- 建议改法：
  - 后续如仍有瓶颈，再评估启动期初始化和连接复用

## P2 结构精简

### 9. 拆分超大 `app.js`
- 目标：降低复杂度，减少“一个状态牵一大片”的问题。
- 现状：
  - `app.js` 超过 7000 行，包含报价轮询、套利、详情、报警、日志、数据终端、保存、主题等多职责
- 建议拆分：
  - `quote-polling`
  - `arb-panel`
  - `arb-detail`：已先抽出刷新调度器 `arb-detail-refresh-utils.js`
  - `path-alerts`
  - `data-terminal`
  - `dashboard-persistence`

### 10. 清理历史命名和过渡兼容层
- 目标：去掉“功能已变，但名字还停留在旧时代”的残留。
- 现状：
  - `quote-calculator.js` 里的旧计算器残留已在运行时边界重构中移除
  - `app.js` 内部 `legacy quote alert` 函数命名已收敛为 `quote alert`
  - 未被生产代码调用的 `quote-alert-config-utils.js` 旧迁移工具已移除
  - `PathAlertNotificationUtils.buildLegacyQuoteAlertRemotePayload` 兼容导出已移除
  - 未使用的 generic alert log 渲染路径已移除
  - `path-alerts-app.js` 中旧的批量删除/忽略辅助函数已移除，当前无只定义未调用的顶层函数
  - 多处 `fallback / legacy / muted restored` 逻辑交错在 `app.js`
- 建议改法：
  - 先删死代码和无生产调用 API
  - 继续统一剩余兼容边界命名
  - 最后收拢兼容逻辑边界

### 11. 后端报价路由工厂化
- 目标：降低 `server.js` 的重复样板。
- 现状：
  - 已提炼 `registerMarketQuoteRoute()` / `registerCexQuoteRoute()`
  - DEX/CEX provider 路由注册已改成表驱动，新增 provider 时集中追加 route config
- 建议改法：
  - 后续如果 provider 继续增加，再把 route config 下沉到独立模块

## P3 观察项

### 12. muted 状态轮询降频或事件化
- 现状：
  - 已把 `syncMutedPathLogTimer()` 从固定 1 秒 `setInterval` 改成动态 `setTimeout`
  - 日志面板可见时保留 1 秒倒计时刷新；隐藏时按最近过期时间唤醒，最长 60 秒检查一次
- 建议：
  - 后续如果继续拆 `app.js`，把 muted runtime 独立到 `path-alerts` 模块

### 13. 多通道默认间隔再校准
- 现状：
  - 当前默认间隔整体偏激进，多通道开启后容易形成并发请求堆积
- 建议：
  - 结合真实使用频率重新分层
  - 对非关键源、隐藏面板、后台标签页做降频

## 建议讨论顺序

### 第一组：直接打 CPU
1. 后端请求配置缓存
2. 套利面板隐藏时停止重算
3. 路径报警无任务时停表
4. 套利详情刷新改成受控轮询

### 第二组：避免重复失效与重复渲染
5. 行情状态 / UI 状态拆分
6. 套利面板与数据终端缓存化
7. sqlite 初始化优化

### 第三组：结构清理
8. 拆分 `app.js`
9. 清理历史命名与兼容层
10. 后端路由工厂化
