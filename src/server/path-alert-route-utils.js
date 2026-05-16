const { normalizeAlertConfig } = require('../path-alerts/path-alert-utils');
const {
    buildPathAlertQuoteCandidatesFromConfig: defaultBuildPathAlertQuoteCandidatesFromConfig
} = require('./path-alert-candidate-service');
const {
    sendPathAlertRemoteWebhooks: defaultSendPathAlertRemoteWebhooks
} = require('./path-alert-webhook-utils');

async function loadAlertConfig({ alertConfigPath, readJsonFile }) {
    try {
        const parsedData = await readJsonFile(alertConfigPath);
        return normalizeAlertConfig(parsedData);
    } catch (error) {
        if (error instanceof SyntaxError || error.code === 'ENOENT') {
            return normalizeAlertConfig();
        }
        throw error;
    }
}

function registerPathAlertRoutes(options) {
    const app = options.app;
    const alertConfigPath = options.alertConfigPath;
    const configPath = options.configPath;
    const readJsonFile = options.readJsonFile;
    const safeWriteJsonFile = options.safeWriteJsonFile;
    const getConfigMore = options.getConfigMore;
    const marketClients = options.marketClients;
    const fetchImpl = options.fetchImpl;
    const telegramBotApiBaseUrlOverride = options.telegramBotApiBaseUrlOverride;
    const buildPathAlertQuoteCandidatesFromConfig = options.buildPathAlertQuoteCandidatesFromConfig || defaultBuildPathAlertQuoteCandidatesFromConfig;
    const sendPathAlertRemoteWebhooks = options.sendPathAlertRemoteWebhooks || defaultSendPathAlertRemoteWebhooks;
    const logger = options.logger || console;

    async function getAlertConfig() {
        return loadAlertConfig({ alertConfigPath, readJsonFile });
    }

    app.post('/api/save-alert-config', async (req, res) => {
        try {
            const normalized = normalizeAlertConfig(req.body);
            await safeWriteJsonFile(alertConfigPath, normalized);
            res.json({ message: '路径报警配置保存成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/get-alert-config', async (req, res) => {
        try {
            res.json(await getAlertConfig());
        } catch (error) {
            logger.error('Alert Config Read Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/path-alert-quote-candidates', async (req, res) => {
        try {
            res.json(await buildPathAlertQuoteCandidatesFromConfig({
                configPath,
                readJsonFile,
                marketClients
            }));
        } catch (error) {
            logger.error('Path Alert Candidate Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/send-path-alert-webhook', async (req, res) => {
        try {
            const result = await sendPathAlertRemoteWebhooks({
                alertConfig: await getAlertConfig(),
                configMore: await getConfigMore(),
                title: req.body && req.body.title,
                body: req.body && req.body.body,
                telegramHtmlBody: req.body && req.body.telegramHtmlBody
            }, {
                fetchImpl,
                telegramBotApiBaseUrlOverride
            });
            if (result.statusCode >= 400) {
                return res.status(result.statusCode).json(result.payload);
            }
            res.json(result.payload);
        } catch (error) {
            logger.error('Path Alert Webhook Error:', error);
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = {
    loadAlertConfig,
    registerPathAlertRoutes
};
