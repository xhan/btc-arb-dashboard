const assert = require('assert');

const {
  sendPathAlertDayAppWebhook,
  sendPathAlertRemoteWebhooks,
  sendPathAlertTelegramWebhook
} = require('../src/server/path-alert-webhook-utils');

function createResponse(ok = true, status = 200) {
  return { ok, status };
}

async function runDayAppTest() {
  const calls = [];
  const result = await sendPathAlertDayAppWebhook(
    {
      settings: {
        webhookEnabled: true,
        dayAppEnabled: true,
        webhookUrl: 'https://day.example/[title]/[body]'
      }
    },
    '收益 +1',
    'A -> B',
    {
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return createResponse();
      }
    }
  );

  assert.deepStrictEqual(result, { sent: true, channel: 'dayapp' });
  assert.deepStrictEqual(calls, [{
    url: 'https://day.example/%E6%94%B6%E7%9B%8A%20%2B1/A%20-%3E%20B',
    options: { method: 'GET' }
  }]);

  assert.deepStrictEqual(
    await sendPathAlertDayAppWebhook({ settings: { webhookEnabled: false, dayAppEnabled: true } }, 't', 'b'),
    { sent: false, channel: 'dayapp', reason: 'disabled' }
  );
}

async function runTelegramTest() {
  const calls = [];
  const result = await sendPathAlertTelegramWebhook(
    {
      telegramBotToken: 'bot-token',
      telegramChatId: 'chat-id',
      telegramBotApiBaseUrl: 'https://telegram.example'
    },
    'Title',
    'plain body',
    '<b>html body</b>',
    {
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return createResponse();
      }
    }
  );

  assert.deepStrictEqual(result, { sent: true, channel: 'telegram' });
  assert.strictEqual(calls[0].url, 'https://telegram.example/botbot-token/sendMessage');
  assert.strictEqual(calls[0].options.method, 'POST');
  assert.deepStrictEqual(JSON.parse(calls[0].options.body), {
    chat_id: 'chat-id',
    text: 'Title\n\n<b>html body</b>',
    parse_mode: 'HTML'
  });

  assert.deepStrictEqual(
    await sendPathAlertTelegramWebhook({ telegramEnabled: false }, 't', 'b'),
    { sent: false, channel: 'telegram', reason: 'disabled' }
  );
  assert.deepStrictEqual(
    await sendPathAlertTelegramWebhook({ telegramBotToken: '', telegramChatId: '' }, 't', 'b'),
    { sent: false, channel: 'telegram', reason: 'missing-config' }
  );
}

async function runRemoteWebhookResponseTest() {
  const calls = [];
  const success = await sendPathAlertRemoteWebhooks({
    alertConfig: {
      settings: {
        webhookEnabled: true,
        dayAppEnabled: true,
        telegramEnabled: true,
        webhookUrl: 'https://day.example/[title]/[body]'
      }
    },
    configMore: {
      telegramBotToken: 'bot-token',
      telegramChatId: 'chat-id',
      telegramBotApiBaseUrl: 'https://telegram.example'
    },
    title: ' Title ',
    body: ' Body ',
    telegramHtmlBody: ''
  }, {
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return createResponse();
    }
  });

  assert.deepStrictEqual(success, {
    statusCode: 200,
    payload: {
      message: '路径报警 webhook 已发送',
      channels: ['dayapp', 'telegram']
    }
  });
  assert.strictEqual(calls.length, 2);

  assert.deepStrictEqual(
    await sendPathAlertRemoteWebhooks({
      alertConfig: { settings: { webhookEnabled: false } },
      configMore: {},
      title: 't',
      body: 'b'
    }),
    { statusCode: 400, payload: { error: '路径报警 webhook 未配置' } }
  );

  assert.deepStrictEqual(
    await sendPathAlertRemoteWebhooks({
      alertConfig: { settings: { webhookEnabled: true, dayAppEnabled: false, telegramEnabled: true } },
      configMore: {},
      title: 't',
      body: 'b'
    }),
    { statusCode: 400, payload: { error: '路径报警远程推送未配置' } }
  );
}

async function runErrorTest() {
  await assert.rejects(
    () => sendPathAlertDayAppWebhook(
      { settings: { webhookEnabled: true, dayAppEnabled: true, webhookUrl: 'https://day.example/[title]/[body]' } },
      't',
      'b',
      { fetchImpl: async () => createResponse(false, 503) }
    ),
    /Day\.app 响应异常: 503/
  );
}

Promise.resolve()
  .then(runDayAppTest)
  .then(runTelegramTest)
  .then(runRemoteWebhookResponseTest)
  .then(runErrorTest)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
