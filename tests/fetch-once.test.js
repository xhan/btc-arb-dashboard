const assert = require('assert');

const { createFetchOnce } = require('../fetch-once');

(async () => {
  let callCount = 0;
  const fakeFetch = async () => {
    callCount += 1;
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
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
