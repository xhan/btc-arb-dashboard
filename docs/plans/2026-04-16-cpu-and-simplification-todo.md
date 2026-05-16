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
  - `restartPathAlertScheduler()` 启动前会通过 `dashboard-runtime-utils.hasActivePathAlertEvaluationTarget()` 判断是否存在启用中的非 quote 报警
  - 非 quote 报警过滤已统一到 `dashboard-runtime-utils.getActivePathAlertEvaluationAlerts()`，调度器和实际评估列表共用同一规则
  - 只有 quote 报警时不启动路径报警 1s 轮询，quote alert 仍保留独立判断链路
- 预期收益：
  - 已降低前端持续 CPU 占用
  - 降低套利快照被高频消费的频率
- 后续建议：
  - 若未来新增报警类型，先补 `getActivePathAlertEvaluationAlerts()` 的目标过滤测试

### 4. 套利详情刷新从“死循环”改成“受控轮询”
- 目标：避免详情弹窗打开后无间隔连续刷新。
- 现状：
  - 已移除 `startArbDetailLoop()` 内的长期 `while (...)` 循环
  - 详情刷新改为单次刷新完成后用 `setTimeout` 调度下一轮，并在关闭/重启时清理 timer
  - 调度状态机已下沉到 `src/arb/arb-detail-refresh-utils.js`，`app.js` 只保留业务回调和生命周期入口
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
  - `quoteUiState` 的默认值、key 规范化、merge、timer 清理已下沉到 `src/dashboard/dashboard-runtime-utils.js`
  - `quote-pause-utils.buildPausedQuoteState()` 已停止输出 UI-only 字段
  - quote 暂停按钮和分区暂停按钮的展示状态模型已下沉到 `src/quote/quote-pause-utils.js`
  - quote alert display label 已下沉到 `src/quote/quote-display-utils.js`
  - quote alert 按 quoteId 过滤规则已下沉到 `path-alert-utils.js`，避免 `app.js` 继续直接理解 alert target 结构
  - quote alert trigger entry 的结构拼装已下沉到 `path-alert-notification-utils.js`
  - quote alert action link 的结构转换已下沉到 `path-alert-notification-utils.js`
  - quote 跨链显示名已下沉到 `chain-defaults.js`
  - dashboardState 按 quoteId 查找 quote 的逻辑已下沉到 `src/dashboard/dashboard-runtime-utils.js`
  - 已新增 market-state signature，`setQuoteMarketState()` 只在市场字段变化时推进套利/数据终端 revision
  - `quoteMarketState` / `quoteUiState` 的 Map 所有权和 market revision 已下沉到 `src/quote/quote-state-runtime-utils.js`，`app.js` 只通过 runtime wrapper 读写
  - 金额输入 debounce timer Map 已下沉到 `src/dashboard/dashboard-runtime-utils.js`，暂停 quote 时通过统一 runtime 清理待执行输入更新
  - 主题切换的合法值、next-state 和 DOM/storage 写入计划已下沉到 `theme-utils.js`
- 预期收益：
  - 已减少 UI-only 更新导致的不必要套利缓存失效
  - 继续降低前端重复计算
- 后续建议：
  - 保持只有行情字段变更时才失效套利缓存
  - 后续继续拆 `app.js` 时，保留 quote state runtime 作为唯一状态边界，不再新增直接 Map source of truth

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
  - 已用 `dashboardState + quoteMarketState` cache key 缓存生成的 records
  - records 构建已下沉到 `data-terminal-utils.js`，`app.js` 只保留缓存生命周期
  - 已用同一 cache key 缓存 candidates，查询、别名、diff 变化只重跑 view model/filter
  - records/candidates 缓存生命周期已下沉到 `data-terminal-utils.js` 的 `createDataTerminalCache()`，`app.js` 只提供 cache key 和构建函数
- 预期收益：
  - 已降低数据终端打开后的持续 CPU
- 后续建议：
  - 若数据量继续增长，再对数据终端 DOM 做局部更新

### 8. sqlite 连接与 schema 初始化下沉
- 目标：减少后端图表/快照接口的重复初始化成本。
- 现状：
  - `price-snapshot-store.js` 仍按调用打开/关闭 DB
  - 已增加 per-dbPath schema-ready 缓存，避免每次调用重复执行 `ensureSchema()`
  - 前端 price snapshot interval timer 生命周期已下沉到 `price-snapshot-payload-utils.js`
- 预期收益：
  - 降低 Node CPU 和重复 schema 初始化成本
  - 降低图表预览自动刷新带来的额外成本
- 建议改法：
  - 后续如仍有瓶颈，再评估启动期初始化和连接复用

## P2 结构精简

### 9. 拆分超大 `app.js`
- 目标：降低复杂度，减少“一个状态牵一大片”的问题。
- 现状：
  - `app.js` 仍是超大文件，包含报价轮询、套利、详情、报警、日志、数据终端、保存、主题等多职责
- 建议拆分：
  - `quote-polling`：队列运行态、scheduler、消费状态机和 active fetch controller Map 已下沉到 `src/quote/quote-queue-runtime-utils.js`，`app.js` 只保留业务依赖注入和入口包装
  - `quote-request`：source 支持链判断已下沉到 `src/quote/quote-request-utils.js`，`app.js` 不再维护 Kyber/0x 支持链常量
  - `quote-ui-runtime`：hover 延迟显示、tooltip 展示模型、request channel tag DOM patch、trend arrow 展示模型和 trend timer 已分别下沉到 `src/quote/quote-display-utils.js` / `src/quote/quote-state-runtime-utils.js`
  - `arb-panel`：snapshot / topology 缓存、面板刷新 debounce 所有权、全局过滤栏读写计划和面板内容事件动作解析已下沉到 `src/arb/arb-path-template-cache-utils.js` / `src/arb/arb-runtime-memory-utils.js` / `src/arb/arb-panel-layout-utils.js` / `src/arb/arb-panel-renderer.js`，`app.js` 只保留缓存 key 构建、面板数据装配和动作分发
  - `arb-detail`：详情刷新调度器、图表自动刷新 runtime 已下沉到 `src/arb/arb-detail-refresh-utils.js`，source budget Map、详情网格事件动作解析已下沉到 `src/arb/arb-detail-utils.js`
  - `path-alerts`：runtime Map、force-immediate flag、配置同步 payload/storage event 和保存/评估/reload timer 生命周期已下沉到 `path-alert-utils.js`，面板 change/click action 解析已下沉到 `path-alert-page-utils.js`
  - `data-terminal`：records/candidates cache、刷新 timer、面板 HTML、控件状态读写计划、selection 更新计划、内容和 header 点击动作解析已下沉到 `data-terminal-utils.js`
  - `dashboard-persistence`：配置保存 debounce timer、金额输入 debounce、保存按钮反馈 runtime 已下沉到 `src/dashboard/dashboard-runtime-utils.js`，dashboard 输入/按钮动作解析、添加报价/新增分区/报价设置/确认弹窗表单状态、报价设置 modal 写入计划、报价设置表单读取、报价设置保存更新计划和全局设置 interval 表单读写/解析已下沉到 `src/dashboard/dashboard-renderer.js`
  - `snapshot/copy-ui`：价格快照 timer 已下沉到 `price-snapshot-payload-utils.js`，复制提示 timer 已下沉到 `copy-utils.js`
  - `floating-panel-ui`：浮窗拖拽和置顶绑定已下沉到 `dom-render-utils.js`，`app.js` 只保留 z-index 状态所有权
  - `file-layout`：在模块边界稳定后，把根目录里按职责增长的 utils/runtime/renderer/provider 文件迁入明确目录，例如 `src/quote/`、`src/arb/`、`src/path-alerts/`、`src/dashboard/`、`src/shared/`，并保留必要的兼容入口，避免一次性移动导致 review 噪声和路径风险
    - 已启动第一步：套利核心路径算法、套利详情工具、详情刷新 runtime、套利面板渲染器、套利面板 layout/runtime/cache 工具、规则快照、循环起点优先级、资产等价规则、fixed/special 套利工具、watchlist 配置及解析工具迁入 `src/arb/`，后续同类 arb 模块可按这个模式继续迁移
    - 已启动第二步：quote pause/request/display/state/queue runtime 迁入 `src/quote/`，后续同类 quote 模块可按这个模式继续迁移
    - 已启动第三步：dashboard renderer/runtime 迁入 `src/dashboard/`，后续 dashboard 模块按这个目录继续收敛
    - 已启动第四步：request channel 配置、前端工具和 HTTP proxy agent 工具迁入 `src/request-channel/`，后续请求通道边界按这个目录维护

### 10. 清理历史命名和过渡兼容层
- 目标：去掉“功能已变，但名字还停留在旧时代”的残留。
- 现状：
  - `quote-calculator.js` 里的旧计算器残留已在运行时边界重构中移除
  - `app.js` 内部 `legacy quote alert` 函数命名已收敛为 `quote alert`
  - 未被生产代码调用的 `quote-alert-config-utils.js` 旧迁移工具已移除
  - `PathAlertNotificationUtils.buildLegacyQuoteAlertRemotePayload` 兼容导出已移除
  - 未使用的 generic alert log 渲染路径已移除
  - alert log 的 restored muted selector、恢复卡片删除、click action 解析已下沉到 `alert-log-ui-utils.js`
  - muted target key 兼容逻辑、日志标题 snapshot、muted target / muted leg 的状态文案已下沉到 `path-alert-utils.js`
  - `app.js` 中未调用的 muted path timer 包装函数已移除，保留唯一入口 `syncMutedPathLogTimer()`
  - `path-alerts-app.js` 中旧的批量删除/忽略辅助函数已移除，当前无只定义未调用的顶层函数
  - `path-alerts-app.js` 的卡片标题、meta、section 配置和路线行渲染已下沉到 `path-alert-page-utils.js`
  - `path-alerts-app.js` 的报警卡片、已忽略卡片和 section HTML 片段已下沉到 `path-alert-page-utils.js`
  - `path-alerts-app.js` 的交易对上下文 bar label/HTML 已下沉到 `path-alert-page-utils.js`
  - `path-alerts-app.js` 的 dashboard quote 到候选报价转换已下沉到 `path-alert-candidate-utils.js`
  - `path-alerts-app.js` 的编辑器草稿创建、克隆、prefill/alert 还原、target 转换、校验和 alert 构造规则已拆到 `path-alert-editor-utils.js`
  - `path-alerts-app.js` 的交易对报警展示 label、pair text 和默认名称规则已下沉到 `path-alert-page-utils.js`
  - `path-alerts-app.js` 的报警/已忽略项摘要行生成规则已下沉到 `path-alert-page-utils.js`
  - `path-alerts-app.js` 的编辑器已选目标摘要行、规则选择、候选搜索、交易对目标和已选 legs 渲染片段已拆到 `path-alert-editor-utils.js`
  - `path-alerts-app.js` 的候选报价建议项 HTML 已拆到 `path-alert-editor-utils.js`
  - `path-alerts-app.js` 的编辑器主模板已拆到 `path-alert-editor-utils.js`
  - `app.js` 的 path alert panel change/click action 解析已下沉到 `path-alert-page-utils.js`
  - `app.js` 的 path alert 配置同步 payload 构造和 storage event reload 判定已下沉到 `path-alert-utils.js`
  - `app.js` 的 quote hover tooltip CEX/source/preference 展示模型已下沉到 `src/quote/quote-display-utils.js`
  - `app.js` 的 quote request channel tag 插入/更新/删除计划已下沉到 `src/quote/quote-display-utils.js`
  - `app.js` 的 quote trend arrow 涨跌/隐藏展示模型已下沉到 `src/quote/quote-display-utils.js`
  - `app.js` 的 dashboard quote 查找和 quote alert 列表读取单用途包装已移除，调用点直接委托 runtime/path alert utils
  - `app.js` 的套利详情 summary 利润率格式化包装已移除，默认格式化归入 `src/arb/arb-detail-utils.js`
  - `app.js` 的 CEX book format/summary 顶层过渡包装已移除，注入点直接委托 `src/quote/quote-display-utils.js`
  - `app.js` 的 dex link label/button 顶层过渡包装已移除，调用点直接委托 `dex-link-utils.js`
  - `app.js` 的 request channel tag、quote pair label 和 arb detail source HTML 单用途包装已移除，调用点直接委托对应 utils
  - `app.js` 中未调用的 CEX trading pair parser 包装和 `TradingPairUtils` 入口已移除
  - `app.js` 的 single-chain display name 和 paused monitor state 单用途包装已移除，调用点复用现有 helper / utils
  - `app.js` 的多渠道开关 storage 值解析/序列化已下沉到 `src/request-channel/request-channel-utils.js`
  - `app.js` 的 request channel display、queue type 和 queue interval 单用途包装已移除，调用点直接委托 `src/request-channel/request-channel-utils.js` / `queue-stats-utils.js`
  - `app.js` 的 request channel 支持性单用途包装已移除，调用点直接委托 `src/request-channel/request-channel-utils.js`
  - `app.js` 的 Kyber/0x 支持链常量和 source skip 判断注入已下沉到 `src/quote/quote-request-utils.js`
  - `app.js` 的数据终端搜索框/alias/diff toggle DOM 写入计划、事件 patch 构造、row selection patch 和 header click action 已下沉到 `data-terminal-utils.js`
  - `app.js` 的套利机会 current map、detail 保留 store、targetKey 索引已下沉到 `src/arb/arb-runtime-memory-utils.js`
  - `app.js` 的套利机会高亮 Map、timer 生命周期、prune / is-highlighted / mark 规则已下沉到 `src/arb/arb-runtime-memory-utils.js`
  - `app.js` 的套利全局过滤栏 DOM 写入计划和事件 patch 构造已下沉到 `src/arb/arb-panel-layout-utils.js`
  - `app.js` 的路径腿 live quote label 格式化已委托给 `path-alert-page-utils.js`
  - `app.js` 的 path alert 配置加载降级/严格加载语义已下沉到 `path-alert-utils.js` 的 `createPathAlertConfigClient()`
  - `app.js` 中只定义未调用的 `resolveEventTargetElement()` 包装函数已移除，事件解析继续统一走各模块 action resolver
  - `app.js` 的 quote alert 触发消息和当前值文案包装已移除，触发条目构造统一由 `path-alert-notification-utils.js` 根据 evaluation 生成
  - `app.js` 的 dashboard 金额输入、暂停、设置、删除、添加和交换按钮动作解析已下沉到 `src/dashboard/dashboard-renderer.js`
  - `app.js` 的添加报价表单可见性、占位符、保存校验、draft quote 构造和 modal click 动作解析已下沉到 `src/dashboard/dashboard-renderer.js`
  - `app.js` 的全局设置 interval 表单回填、读取和默认值 fallback 解析已下沉到 `src/dashboard/dashboard-renderer.js`
  - `app.js` 的新增分区表单读取、draft category 构造和 modal click 动作解析已下沉到 `src/dashboard/dashboard-renderer.js`
  - `app.js` 的报价设置 modal click 动作解析已下沉到 `src/dashboard/dashboard-renderer.js`
  - `app.js` 的报价设置保存更新计划已下沉到 `src/dashboard/dashboard-renderer.js`，主文件只应用 patch、同步请求通道 tag 和调度刷新
  - `app.js` 的报价设置表单读取已下沉到 `src/dashboard/dashboard-renderer.js`，主文件只提供 DOM read adapter
  - `app.js` 的确认弹窗 click 动作解析已下沉到 `src/dashboard/dashboard-renderer.js`
  - `app.js` 的报价设置 modal viewState 写入规则已下沉到 `src/dashboard/dashboard-renderer.js`，主文件只执行 DOM write plan
  - `app.js` 的浮窗拖拽实现和浮窗 focus 事件绑定已下沉到 `dom-render-utils.js`
  - `app.js` 的主题 metadata、循环顺序和主题写入计划已下沉到 `theme-utils.js`
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
  - muted target / leg 列表和 timer 所有权已下沉到 `muted-path-runtime-utils.js`，`app.js` 保留持久化、UI 渲染和联动刷新回调
- 建议：
  - 后续如果继续拆 `app.js`，把持久化和 UI 回调继续收拢到 `path-alerts` 模块

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
