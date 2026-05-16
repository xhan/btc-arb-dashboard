const assert = require('assert');

const { createFetchOnce } = require('../src/server/fetch-once');

(async () => {
  let callCount = 0;
  let capturedOptions = null;
  const fakeFetch = async (url, options) => {
    callCount += 1;
    capturedOptions = options;
    return {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'boom'
    };
  };
  const fetchOnce = createFetchOnce({
    fetchImpl: fakeFetch,
    agentCache: new Map()
  });

  await assert.rejects(
    () => fetchOnce('https://example.com/quote', {}, {}),
    /API响应错误: 500/
  );

  assert.strictEqual(callCount, 1, '失败时只应发起一次底层请求');
  assert.ok(
    capturedOptions && capturedOptions.headers && typeof capturedOptions.headers['User-Agent'] === 'string',
    '默认应显式携带浏览器 User-Agent'
  );
  assert.ok(
    capturedOptions.headers['User-Agent'].includes('Chrome/'),
    '默认 User-Agent 应伪装为 Chrome 浏览器'
  );

  let overrideOptions = null;
  const fetchOnceWithOverride = createFetchOnce({
    fetchImpl: async (url, options) => {
      overrideOptions = options;
      return {
        ok: true,
        json: async () => ({ ok: true })
      };
    },
    agentCache: new Map()
  });

  await fetchOnceWithOverride('https://example.com/ok', {
    headers: {
      'User-Agent': 'custom-agent'
    }
  }, {});

  assert.strictEqual(
    overrideOptions.headers['User-Agent'],
    'custom-agent',
    '调用方显式传入 User-Agent 时不应被覆盖'
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
