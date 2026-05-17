const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'src/app/dashboard-app.js'), 'utf8');
const queueRuntimeJs = fs.readFileSync(path.join(__dirname, '..', 'src/quote/quote-queue-runtime-utils.js'), 'utf8');

assert.ok(
  appJs.includes('const quoteQueueRuntime = getQuoteQueueRuntimeUtils().createQuoteQueueRuntime({'),
  '主看板应通过 QuoteQueueRuntimeUtils 创建队列运行时'
);

assert.ok(
  appJs.includes('const activeFetchControllerRuntime = getQuoteQueueRuntimeUtils().createActiveFetchControllerRuntime({'),
  '主看板应通过 QuoteQueueRuntimeUtils 创建 fetch controller 运行时'
);

assert.ok(
  !appJs.includes('let activeFetchControllers = new Map();'),
  '主看板不应直接持有 active fetch controller Map'
);

assert.ok(
  appJs.includes('quoteQueueRuntime.addToQueue(quote);'),
  '主看板添加报价时应委托队列运行时'
);

assert.ok(
  appJs.includes('quoteQueueRuntime.removeFromQueue(quoteId);'),
  '主看板删除报价任务时应委托队列运行时'
);

assert.ok(
  appJs.includes('quoteQueueRuntime.updateSchedulers();'),
  '主看板刷新 scheduler 时应委托队列运行时'
);

assert.ok(
  !appJs.includes('function processQueue(type)'),
  '主看板不应继续持有队列消费状态机'
);

assert.ok(
  !appJs.includes('let queues = {};') && !appJs.includes('let indices = {};') && !appJs.includes('let timers = {};'),
  '主看板不应继续持有队列、索引和定时器状态'
);

assert.ok(
  queueRuntimeJs.includes('function processQueue(type)'),
  '队列消费入口应下沉到 QuoteQueueRuntimeUtils'
);

assert.ok(
  queueRuntimeJs.includes('const queues = {};') && queueRuntimeJs.includes('const indices = {};') && queueRuntimeJs.includes('const timers = {};'),
  '队列运行时应集中持有队列、索引和定时器状态'
);

assert.ok(
  queueRuntimeJs.includes('function createActiveFetchControllerRuntime(options = {})'),
  'fetch controller 状态应集中在 QuoteQueueRuntimeUtils'
);

assert.ok(
  !appJs.includes('function abortQuoteFetch(')
    && appJs.includes('activeFetchControllerRuntime.abort(quote.id);')
    && appJs.includes('activeFetchControllerRuntime.abort(quoteId);'),
  '主看板不应保留 fetch abort 单用途包装'
);

assert.ok(
  !appJs.includes('function abortActiveQuoteFetches(')
    && appJs.includes('activeFetchControllerRuntime.abortAll();'),
  '主看板不应保留 active fetch 批量 abort 单用途包装'
);

assert.ok(
  appJs.includes('function rebuildQueuesForMultiChannelToggle(previousEnabled, nextEnabled)'),
  '多渠道开关应通过统一的批量重排队列逻辑切换'
);

assert.ok(
  appJs.includes('queueQuoteRefresh(quote, { updateSchedulers: false });'),
  '多渠道开关切换后应批量回收到队列，并只在最后统一刷新 scheduler'
);

assert.ok(
  appJs.includes('clearInverse: options.clearInverse === true'),
  '普通入队刷新不应默认清掉已有反向报价'
);

assert.ok(
  appJs.includes('queueQuoteRefresh(quote, { clearInverse: quote.showInverse !== true });'),
  '关闭反向报价时应明确清理反向报价 DOM'
);

assert.ok(
  !appJs.includes('let touched = false;') && !appJs.includes('if (!touched)'),
  '多渠道队列重排不应保留无实际分支差异的 touched 状态'
);

assert.ok(
  appJs.includes('getQueueStatsUtils().appendQuoteQueueTasks(queue, quote)'),
  '队列 task 构造和去重应继续复用 QueueStatsUtils'
);

assert.ok(
  appJs.includes('getQueueStatsUtils().removeQuoteTasksFromQueues(queueState, quoteId)'),
  '删除 quote 任务应继续复用 QueueStatsUtils，避免多处维护队列结构'
);

assert.ok(
  appJs.includes('getQueueStatsUtils().deferQueueTask(queue, index)'),
  '当前任务 defer 的索引规则应继续由 QueueStatsUtils 统一维护'
);

assert.ok(
  !appJs.includes('function buildQueueTasksForQuote(quote)'),
  '主看板不应保留本地 task 生成规则'
);

assert.ok(
  appJs.includes('getQueueStatsUtils().buildManagedQueueKeys({'),
  '受管理队列集合应由 QueueStatsUtils 统一生成'
);

assert.ok(
  !appJs.includes('const defaultChannelId = requestChannelOptions && requestChannelOptions.defaultChannelId'),
  '主看板不应自己拼默认 request-channel 队列 key'
);

assert.ok(
  appJs.includes('getQueueStatsUtils().getQueueTaskStatus('),
  '队列任务状态判断应由 QueueStatsUtils 统一维护'
);

assert.ok(
  !appJs.includes("const inverseTaskInvalid = taskFromQueue.mode === 'inverse'"),
  '主看板不应保留本地 inverse task 有效性判断'
);

assert.ok(
  appJs.includes('getEffectiveRequestChannelIdForQuote(quote)'),
  '主看板请求与队列归类都应走生效渠道，而不是直接读原始 requestChannelId'
);

assert.ok(
  !appJs.includes('fetchSingleQuote(newQuote);'),
  '新增报价后不应直接请求，应只进入队列'
);

assert.ok(
  !appJs.includes('fetchSingleQuote(quote);'),
  '主看板交互入口不应直接请求报价'
);

assert.ok(
  !appJs.includes('setTimeout(() => fetchSingleQuote(quote), 0);'),
  '切换 source/channel/showInverse 后不应直连刷新，应等待队列消费'
);

assert.ok(
  appJs.includes("requestChannelId: 'default'"),
  '套利详情应继续强制走默认通道'
);

assert.ok(
  appJs.includes('beforeSourceAttempt: (source) => waitForArbDetailSourceBudget(source, controller.signal)'),
  '套利详情应继续保留独立的 source budget 控制'
);
