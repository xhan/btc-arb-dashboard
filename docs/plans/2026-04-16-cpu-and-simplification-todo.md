# CPU 与结构简化 Todo List

> 讨论版清单：先按优先级确认，再逐项实施。

## P0 立即处理

### 1. 后端请求配置缓存
- 目标：去掉高频报价接口里的重复读文件、JSON 解析和 request-channel 归一化。
- 现状：
  - `server.js` 里的 `buildQuoteRequestInput()` 每次都会走 `getRequestChannelsConfig()`
  - `getRequestChannelsConfig()` 每次都会重新读取 `config.json`、`config_more.json`、`request_channels.json`
- 预期收益：
  - 明显降低 Node CPU 和磁盘 IO
  - 降低高频报价时的尾延迟
- 建议改法：
  - 增加内存缓存
  - 在 `/api/save-config`、`/api/save-alert-config`、未来请求通道保存接口里做定向失效
  - 把“启动时默认配置”和“运行时热更新配置”职责拆开

### 2. 套利面板隐藏时停止重算
- 目标：套利大盘不可见时不再做全量路径重算和整块 DOM 重建。
- 现状：
  - 每次主报价成功都会 `scheduleArbUpdate()`
  - `updateArbPanel()` 会全量构建 `buildArbPanelData()` 并 `innerHTML` 重建
  - 即使 `arbPathWindow` 隐藏也会继续执行
- 预期收益：
  - 明显降低前端主线程 CPU
  - 减少由报价更新触发的大对象构建和字符串拼接
- 建议改法：
  - 引入“面板是否可见”判定
  - 隐藏时只标记 dirty，不立即重算
  - 再次打开面板时补做一次最新重算

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
  - `startArbDetailLoop()` 使用 `while (...)` 持续刷
  - 每轮会对每张卡片、每条腿串行请求
  - 详情还可能同步更新主报价状态
- 预期收益：
  - 同时降低前端和后端 CPU
  - 明显降低详情页打开时的请求风暴
- 建议改法：
  - 改成固定间隔轮询，例如 2s/3s
  - 输入编辑时暂停自动刷新
  - 图表刷新和详情报价刷新共用预算，不双重拉取

## P1 高优先级

### 5. 把行情状态和 UI 状态拆开
- 目标：避免 UI 变化误伤套利缓存。
- 现状：
  - `quoteMonitorState` 同时存价格、反向价格、趋势箭头 timer、未读报警等 UI 字段
  - `setQuoteMonitorState()` 会统一触发套利快照失效
- 预期收益：
  - 减少不必要的套利缓存失效
  - 降低前端重复计算
- 建议改法：
  - 拆成 `quoteMarketState` 和 `quoteUiState`
  - 只有行情字段变更时才失效套利缓存

### 6. 减少整块 `innerHTML` 重建
- 目标：减少大面板反复全量重绘。
- 现状：
  - 套利面板、路径报警面板、数据终端都大量依赖 `innerHTML`
  - 数据量一大时，字符串构建和节点替换成本高
- 预期收益：
  - 降低前端渲染抖动
  - 提升交互稳定性
- 建议改法：
  - 先从套利面板做增量更新或最小重绘
  - 路径报警面板保持“仅在可见时刷新”
  - 数据终端至少先做 records/candidates 缓存

### 7. 数据终端缓存化
- 目标：避免每次刷新都重建 records 和 candidates。
- 现状：
  - `renderDataTerminalPanel()` 每次都会从 `dashboardState + quoteMonitorState` 重建全量数据
  - 然后再跑搜索、别名、diff 计算
- 预期收益：
  - 降低数据终端打开后的持续 CPU
- 建议改法：
  - 维护基于 `quoteStateRevision` 的缓存
  - 查询变化只重跑 filter，不重建底层 records

### 8. sqlite 连接与 schema 初始化下沉
- 目标：减少后端图表/快照接口的重复初始化成本。
- 现状：
  - `price-snapshot-store.js` 每次调用都会打开 DB，并执行 `ensureSchema()`
- 预期收益：
  - 降低 Node CPU
  - 降低图表预览自动刷新带来的额外成本
- 建议改法：
  - 启动期初始化 DB/schema
  - 运行期复用连接或至少复用 schema-ready 状态

## P2 结构精简

### 9. 拆分超大 `app.js`
- 目标：降低复杂度，减少“一个状态牵一大片”的问题。
- 现状：
  - `app.js` 超过 7000 行，包含报价轮询、套利、详情、报警、日志、数据终端、保存、主题等多职责
- 建议拆分：
  - `quote-polling`
  - `arb-panel`
  - `arb-detail`
  - `path-alerts`
  - `data-terminal`
  - `dashboard-persistence`

### 10. 清理历史命名和过渡兼容层
- 目标：去掉“功能已变，但名字还停留在旧时代”的残留。
- 现状：
  - `quote-calculator.js` 里 `buildCalculatorEntry/formatCalculatorEntry` 更像旧功能残留
  - `legacy quote alert` 相关逻辑已经并入统一 runtime，但命名仍分裂
  - 多处 `fallback / legacy / muted restored` 逻辑交错在 `app.js`
- 建议改法：
  - 先删死代码和无生产调用 API
  - 再统一命名
  - 最后收拢兼容逻辑边界

### 11. 后端报价路由工厂化
- 目标：降低 `server.js` 的重复样板。
- 现状：
  - `/api/get-0x-quote`、`/api/get-lifi-quote`、`/api/get-ekubo-quote` 等路由结构高度重复
- 建议改法：
  - 提炼通用的 route factory
  - 统一 requestContext 构建、错误日志、响应格式

## P3 观察项

### 12. muted 状态轮询降频或事件化
- 现状：
  - `syncMutedPathLogTimer()` 每秒刷新一次本地存储、日志状态和面板
- 建议：
  - 改成“最接近过期时间”的动态 timer
  - 或只在相关 tab 可见时刷新 UI

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
