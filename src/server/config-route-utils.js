const {
    sanitizeRequestChannelsForClient
} = require('../request-channel/request-channel-config');
const { normalizeArbCycleStartPriority } = require('../arb/arb-cycle-priority-utils');
const { normalizeTokenMetaCacheKey } = require('../market-clients/token-meta');

function getCachedTokenSymbol(metadataCache, chain, token) {
    const meta = metadataCache && metadataCache[normalizeTokenMetaCacheKey(chain, token)];
    return String(meta && meta.symbol || '').trim();
}

function buildQuoteMarketStateSeed(configData, metadataCache = {}) {
    const dashboard = Array.isArray(configData && configData.dashboard) ? configData.dashboard : [];
    const result = {};

    for (const category of dashboard) {
        const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
        for (const quote of quotes) {
            if (!quote || quote.id === undefined || quote.id === null) continue;
            const fromSymbol = getCachedTokenSymbol(metadataCache, quote.chain, quote.fromToken);
            const toSymbol = getCachedTokenSymbol(metadataCache, quote.chain, quote.toToken);
            if (!fromSymbol || !toSymbol) continue;
            result[quote.id] = { fromSymbol, toSymbol };
        }
    }

    return result;
}

async function buildConfigResponse(parsedData, options) {
    if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        return parsedData;
    }
    const marketClients = options && options.marketClients;
    if (!marketClients || typeof marketClients.loadTokenMetaCache !== 'function') {
        return parsedData;
    }

    try {
        const quoteMarketStateById = buildQuoteMarketStateSeed(parsedData, await marketClients.loadTokenMetaCache());
        if (Object.keys(quoteMarketStateById).length === 0) {
            return parsedData;
        }
        return { ...parsedData, quoteMarketStateById };
    } catch (error) {
        const logger = options.logger || console;
        if (logger && typeof logger.warn === 'function') {
            logger.warn('Token metadata cache read failed:', error);
        }
        return parsedData;
    }
}

function registerConfigRoutes(options) {
    const app = options.app;
    const configPath = options.configPath;
    const readJsonFile = options.readJsonFile;
    const safeWriteConfig = options.safeWriteConfig;
    const refreshRuntimeConfigCache = options.refreshRuntimeConfigCache;
    const getRequestChannelsConfig = options.getRequestChannelsConfig;
    const getConfigMore = options.getConfigMore;
    const marketClients = options.marketClients;
    const logger = options.logger || console;

    app.post('/api/save-config', async (req, res) => {
        try {
            await safeWriteConfig(req.body);
            await refreshRuntimeConfigCache();
            res.json({ message: '配置保存成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/request-update-config', async (req, res) => {
        try {
            const cache = await refreshRuntimeConfigCache();
            res.json({
                message: '运行时配置已刷新',
                requestChannelCount: Array.isArray(cache.requestChannelsConfig.channels) ? cache.requestChannelsConfig.channels.length : 0
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/get-config', async (req, res) => {
        try {
            const parsedData = await readJsonFile(configPath);
            res.json(await buildConfigResponse(parsedData, { marketClients, logger }));
        } catch (error) {
            if (error instanceof SyntaxError) {
                logger.error('Config JSON Parse Error:', error);
                return res.json([]);
            }
            if (error.code === 'ENOENT') {
                return res.json([]);
            }
            logger.error('Config Read Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/get-request-channels', async (req, res) => {
        try {
            res.json(sanitizeRequestChannelsForClient(await getRequestChannelsConfig()));
        } catch (error) {
            logger.error('Request Channel Read Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/get-arb-settings', async (req, res) => {
        try {
            const configMore = await getConfigMore();
            res.json({
                cycleStartPriority: normalizeArbCycleStartPriority(configMore.arbCycleStartPriority)
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = {
    buildConfigResponse,
    buildQuoteMarketStateSeed,
    registerConfigRoutes
};
