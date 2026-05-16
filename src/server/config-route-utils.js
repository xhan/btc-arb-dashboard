const {
    sanitizeRequestChannelsForClient
} = require('../request-channel/request-channel-config');
const { normalizeArbCycleStartPriority } = require('../arb/arb-cycle-priority-utils');

function registerConfigRoutes(options) {
    const app = options.app;
    const configPath = options.configPath;
    const readJsonFile = options.readJsonFile;
    const safeWriteConfig = options.safeWriteConfig;
    const refreshRuntimeConfigCache = options.refreshRuntimeConfigCache;
    const getRequestChannelsConfig = options.getRequestChannelsConfig;
    const getConfigMore = options.getConfigMore;
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
            res.json(parsedData);
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
    registerConfigRoutes
};
