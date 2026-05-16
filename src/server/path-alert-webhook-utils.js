const {
  buildPathAlertWebhookUrl,
  buildTelegramBotApiUrl,
  DEFAULT_TELEGRAM_BOT_API_BASE_URL
} = require('../path-alerts/path-alert-utils');

function getFetchImpl(options = {}) {
  return options.fetchImpl || fetch;
}

async function sendPathAlertDayAppWebhook(alertConfig, title, body, options = {}) {
  if (!alertConfig || !alertConfig.settings || alertConfig.settings.webhookEnabled !== true) {
    return { sent: false, channel: 'dayapp', reason: 'disabled' };
  }
  if (alertConfig.settings.dayAppEnabled !== true) {
    return { sent: false, channel: 'dayapp', reason: 'disabled' };
  }
  const webhookUrl = buildPathAlertWebhookUrl(alertConfig.settings.webhookUrl, title, body);
  if (!webhookUrl) {
    return { sent: false, channel: 'dayapp', reason: 'missing-config' };
  }

  const response = await getFetchImpl(options)(webhookUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Day.app 响应异常: ${response.status}`);
  }
  return { sent: true, channel: 'dayapp' };
}

async function sendPathAlertTelegramWebhook(configMore, title, body, telegramHtmlBody = '', options = {}) {
  if (!configMore || configMore.telegramEnabled === false) {
    return { sent: false, channel: 'telegram', reason: 'disabled' };
  }
  const botToken = String(configMore && configMore.telegramBotToken || '').trim();
  const chatId = String(configMore && configMore.telegramChatId || '').trim();
  const apiBaseUrl = String(configMore && configMore.telegramBotApiBaseUrl || DEFAULT_TELEGRAM_BOT_API_BASE_URL).trim();
  if (!botToken || !chatId) {
    return { sent: false, channel: 'telegram', reason: 'missing-config' };
  }

  const url = buildTelegramBotApiUrl(botToken, 'sendMessage', options.telegramBotApiBaseUrlOverride || apiBaseUrl);
  if (!url) {
    return { sent: false, channel: 'telegram', reason: 'missing-config' };
  }

  const hasTelegramHtmlBody = String(telegramHtmlBody || '').trim().length > 0;
  const response = await getFetchImpl(options)(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: `${title}\n\n${hasTelegramHtmlBody ? String(telegramHtmlBody || '').trim() : body}`,
      ...(hasTelegramHtmlBody ? { parse_mode: 'HTML' } : {})
    })
  });
  if (!response.ok) {
    throw new Error(`Telegram 响应异常: ${response.status}`);
  }
  return { sent: true, channel: 'telegram' };
}

async function sendPathAlertRemoteWebhooks(input = {}, options = {}) {
  const alertConfig = input.alertConfig || {};
  const configMore = input.configMore || {};
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  const telegramHtmlBody = String(input.telegramHtmlBody || '').trim();
  if (!alertConfig.settings || !alertConfig.settings.webhookEnabled) {
    return { statusCode: 400, payload: { error: '路径报警 webhook 未配置' } };
  }

  const results = await Promise.all([
    sendPathAlertDayAppWebhook(alertConfig, title, body, options),
    sendPathAlertTelegramWebhook({
      ...configMore,
      telegramEnabled: alertConfig.settings.telegramEnabled !== false
    }, title, body, telegramHtmlBody, options)
  ]);
  if (!results.some((item) => item.sent)) {
    return { statusCode: 400, payload: { error: '路径报警远程推送未配置' } };
  }
  return {
    statusCode: 200,
    payload: {
      message: '路径报警 webhook 已发送',
      channels: results.filter((item) => item.sent).map((item) => item.channel)
    }
  };
}

module.exports = {
  sendPathAlertDayAppWebhook,
  sendPathAlertRemoteWebhooks,
  sendPathAlertTelegramWebhook
};
