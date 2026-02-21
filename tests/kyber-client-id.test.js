const assert = require('assert');

const { pickKyberClientId } = require('../kyber-client-id');

assert.strictEqual(
  pickKyberClientId('myclient', 5, () => 0),
  'myclient'
);

assert.strictEqual(
  pickKyberClientId('myclient', 5, () => 0.2),
  'myclient1'
);

assert.strictEqual(
  pickKyberClientId('myclient', 5, () => 0.999999),
  'myclient5'
);

assert.strictEqual(
  pickKyberClientId('myclient', undefined, () => 0.999999),
  'myclient'
);

assert.strictEqual(
  pickKyberClientId('myclient', 0, () => 0.5),
  'myclient'
);
