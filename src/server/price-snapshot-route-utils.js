const {
    normalizePriceSnapshotConfig,
    appendPriceSnapshot: defaultAppendPriceSnapshot,
    getClosestPriceSnapshot: defaultGetClosestPriceSnapshot,
    listRecentChartPairs: defaultListRecentChartPairs,
    getChartSeries: defaultGetChartSeries
} = require('../price-snapshots/price-snapshot-store');
const {
    decorateSnapshotSelection: defaultDecorateSnapshotSelection,
    buildReplayFromSnapshot: defaultBuildReplayFromSnapshot,
    renderReplayText: defaultRenderReplayText
} = require('../price-snapshots/price-snapshot-replay');
const { parseUtc8Input } = require('../shared/time-utils');

const DEFAULT_CHART_PAIR_WINDOW_MS = 10 * 60 * 1000;

function parseSnapshotQuery(query = {}) {
    const at = query.at ? parseUtc8Input(query.at) : new Date();
    if (Number.isNaN(at.getTime())) {
        throw new Error('无效的 at 参数');
    }

    const mode = ['floor', 'nearest', 'ceil'].includes(String(query.mode || '')) ? String(query.mode) : 'floor';
    const maxGapSec = Number.parseInt(query.maxGapSec || query['max-gap-sec'], 10);
    const maxGapMs = Number.isFinite(maxGapSec) && maxGapSec > 0 ? maxGapSec * 1000 : null;
    return { at, mode, maxGapMs };
}

function registerPriceSnapshotRoutes(options) {
    const app = options.app;
    const priceSnapshotDir = options.priceSnapshotDir;
    const getConfigMore = options.getConfigMore;
    const chartPairWindowMs = options.chartPairWindowMs || DEFAULT_CHART_PAIR_WINDOW_MS;
    const appendPriceSnapshot = options.appendPriceSnapshot || defaultAppendPriceSnapshot;
    const getClosestPriceSnapshot = options.getClosestPriceSnapshot || defaultGetClosestPriceSnapshot;
    const listRecentChartPairs = options.listRecentChartPairs || defaultListRecentChartPairs;
    const getChartSeries = options.getChartSeries || defaultGetChartSeries;
    const decorateSnapshotSelection = options.decorateSnapshotSelection || defaultDecorateSnapshotSelection;
    const buildReplayFromSnapshot = options.buildReplayFromSnapshot || defaultBuildReplayFromSnapshot;
    const renderReplayText = options.renderReplayText || defaultRenderReplayText;
    const logMessage = options.logMessage || (() => {});
    const verboseLog = options.verboseLog || (() => {});

    app.get('/api/get-price-snapshot-config', async (req, res) => {
        try {
            const configMore = await getConfigMore();
            res.json(normalizePriceSnapshotConfig(configMore));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/save-price-snapshot', async (req, res) => {
        try {
            const configMore = await getConfigMore();
            const snapshotConfig = normalizePriceSnapshotConfig(configMore);
            if (!snapshotConfig.enabled) {
                return res.json({ message: '价格快照未启用', skipped: true });
            }

            const savedPath = await appendPriceSnapshot(priceSnapshotDir, req.body || {});
            verboseLog('SNAPSHOT', `价格快照已保存: ${savedPath}`);
            res.json({ message: '价格快照保存成功' });
        } catch (error) {
            logMessage('SNAPSHOT_ERR', `价格快照保存失败: ${error.message}`, 'error');
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/get-price-snapshot', async (req, res) => {
        try {
            const { at, mode, maxGapMs } = parseSnapshotQuery(req.query);
            const selection = await getClosestPriceSnapshot(priceSnapshotDir, at, { mode, maxGapMs });
            if (!selection) {
                return res.json(null);
            }

            res.json(decorateSnapshotSelection(selection));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/chart-pairs', async (req, res) => {
        try {
            const pairs = await listRecentChartPairs(priceSnapshotDir, { windowMs: chartPairWindowMs });
            res.json(pairs);
        } catch (error) {
            logMessage('CHART_PAIRS_ERR', `读取图表候选失败: ${error.message}`, 'error');
            res.status(500).json({ error: '读取图表候选失败' });
        }
    });

    app.get('/api/chart-series', async (req, res) => {
        try {
            const quoteId = Number(req.query.quoteId);
            const direction = req.query.direction === 'inverse' ? 'inverse' : req.query.direction === 'forward' ? 'forward' : '';
            const windowSec = Number(req.query.windowSec);
            if (!Number.isFinite(quoteId) || !direction) {
                res.status(400).json({ error: '缺少合法的 quoteId 或 direction' });
                return;
            }

            const series = await getChartSeries(priceSnapshotDir, {
                quoteId,
                direction,
                windowMs: Number.isFinite(windowSec) && windowSec > 0 ? windowSec * 1000 : undefined
            });
            if (!series) {
                res.status(404).json({ error: '未找到图表数据' });
                return;
            }

            res.json(series);
        } catch (error) {
            logMessage('CHART_SERIES_ERR', `读取图表序列失败: ${error.message}`, 'error');
            res.status(500).json({ error: '读取图表序列失败' });
        }
    });

    app.get('/api/replay-arb-snapshot', async (req, res) => {
        try {
            const { at, mode, maxGapMs } = parseSnapshotQuery(req.query);
            const format = String(req.query.format || 'json').toLowerCase() === 'text' ? 'text' : 'json';
            const selection = await getClosestPriceSnapshot(priceSnapshotDir, at, { mode, maxGapMs });

            if (!selection) {
                if (format === 'text') {
                    return res.status(404).type('text/plain; charset=utf-8').send('未找到满足条件的快照');
                }
                return res.status(404).json({ error: '未找到满足条件的快照' });
            }

            const configMore = await getConfigMore();
            const replay = buildReplayFromSnapshot(selection, {
                cycleStartPriority: configMore.arbCycleStartPriority
            });
            if (format === 'text') {
                return res.type('text/plain; charset=utf-8').send(renderReplayText(replay));
            }

            res.json(replay);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = {
    DEFAULT_CHART_PAIR_WINDOW_MS,
    parseSnapshotQuery,
    registerPriceSnapshotRoutes
};
