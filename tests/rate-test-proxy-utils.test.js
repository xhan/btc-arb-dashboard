const assert = require('assert');

const {
  parseProxyList,
  selectProxyByIndex
} = require('../scripts/rate-test-proxy-utils');

assert.deepStrictEqual(parseProxyList(''), []);
assert.deepStrictEqual(parseProxyList('http://127.0.0.1:18081'), [
  { id: 'proxy-1', label: 'proxy-1', url: 'http://127.0.0.1:18081' }
]);

assert.deepStrictEqual(
  parseProxyList('hk01=http://127.0.0.1:18081, hk02=http://127.0.0.1:18082'),
  [
    { id: 'hk01', label: 'hk01', url: 'http://127.0.0.1:18081' },
    { id: 'hk02', label: 'hk02', url: 'http://127.0.0.1:18082' }
  ]
);

const proxies = parseProxyList('hk01=http://127.0.0.1:18081,hk02=http://127.0.0.1:18082');
assert.strictEqual(selectProxyByIndex(proxies, 0).id, 'hk01');
assert.strictEqual(selectProxyByIndex(proxies, 1).id, 'hk02');
assert.strictEqual(selectProxyByIndex(proxies, 2).id, 'hk01');
assert.strictEqual(selectProxyByIndex([], 5), null);
