const assert = require('assert');

const {
  applyRequestChannelToFetchOptions,
  createRequestChannelAgentCache
} = require('../request-channel-http');

(async () => {
  const cache = createRequestChannelAgentCache();
  const originalOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const directOptions = await applyRequestChannelToFetchOptions(originalOptions, {}, cache);
  assert.deepStrictEqual(directOptions, originalOptions);

  const proxiedOptions = await applyRequestChannelToFetchOptions(originalOptions, {
    httpProxy: 'http://127.0.0.1:18001'
  }, cache);
  assert.strictEqual(proxiedOptions.headers['Content-Type'], 'application/json');
  assert.ok(proxiedOptions.agent, '应为带代理的请求注入 agent');

  const proxiedOptionsAgain = await applyRequestChannelToFetchOptions(originalOptions, {
    httpProxy: 'http://127.0.0.1:18001'
  }, cache);
  assert.strictEqual(proxiedOptionsAgain.agent, proxiedOptions.agent, '相同代理应复用 agent');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
