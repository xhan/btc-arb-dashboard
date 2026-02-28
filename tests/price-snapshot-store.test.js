const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  normalizePriceSnapshotConfig,
  buildPriceSnapshotEntry,
  getPriceSnapshotDbPath,
  appendPriceSnapshot,
  getNearestPriceSnapshot,
  getClosestPriceSnapshot
} = require('../price-snapshot-store');

const config = normalizePriceSnapshotConfig({
  enablePriceSnapshot: true,
  priceSnapshotIntervalSec: 10
});

assert.deepStrictEqual(config, {
  enabled: true,
  intervalSec: 10
});

const fallbackConfig = normalizePriceSnapshotConfig({});
assert.deepStrictEqual(fallbackConfig, {
  enabled: false,
  intervalSec: 10
});

const sampleNow = new Date('2026-02-28T12:34:56.789Z');
const samplePayload = {
  clientCapturedAt: '2026-02-28T12:34:55.000Z',
  quotes: [
    {
      quoteId: 1,
      chain: 'ethereum',
      pair: 'WBTC/WETH',
      size: 0.1,
      price: 38.12,
      inversePrice: 0.0262
    }
  ]
};

const entry = buildPriceSnapshotEntry(samplePayload, sampleNow);
assert.strictEqual(entry.capturedAt, sampleNow.toISOString());
assert.strictEqual(entry.capturedAtMs, sampleNow.getTime());
assert.strictEqual(entry.clientCapturedAt, samplePayload.clientCapturedAt);
assert.strictEqual(entry.quotes[0].size, 0.1);
assert.strictEqual(entry.quotes[0].price, 38.12);
assert.strictEqual(entry.quotes[0].pair, 'WBTC/WETH');

const dbPath = getPriceSnapshotDbPath('db/price');
assert.strictEqual(dbPath, path.join('db/price', 'price-snapshots.db'));

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'price-snapshot-'));
  const firstTime = new Date('2026-02-28T12:00:00.000Z');
  const secondTime = new Date('2026-02-28T12:10:00.000Z');

  const savedPath = await appendPriceSnapshot(tempDir, samplePayload, firstTime);
  await appendPriceSnapshot(tempDir, {
    clientCapturedAt: '2026-02-28T12:09:59.000Z',
    quotes: [
      {
        quoteId: 2,
        chain: 'base',
        pair: 'cbBTC/WBTC',
        size: 1,
        price: 0.9999
      }
    ]
  }, secondTime);

  assert.strictEqual(savedPath, path.join(tempDir, 'price-snapshots.db'));
  assert.ok(fs.existsSync(savedPath));

  const nearest = await getNearestPriceSnapshot(tempDir, new Date('2026-02-28T12:05:00.000Z'));
  assert.strictEqual(nearest.capturedAt, firstTime.toISOString());
  assert.strictEqual(nearest.quotes.length, 1);
  assert.strictEqual(nearest.quotes[0].pair, 'WBTC/WETH');
  assert.strictEqual(nearest.quotes[0].size, 0.1);

  const latest = await getNearestPriceSnapshot(tempDir, new Date('2026-02-28T12:59:00.000Z'));
  assert.strictEqual(latest.capturedAt, secondTime.toISOString());
  assert.strictEqual(latest.quotes[0].pair, 'cbBTC/WBTC');

  const none = await getNearestPriceSnapshot(tempDir, new Date('2026-02-28T11:00:00.000Z'));
  assert.strictEqual(none, null);

  const exact = await getClosestPriceSnapshot(tempDir, new Date('2026-02-28T12:10:00.000Z'));
  assert.strictEqual(exact.matchType, 'exact');
  assert.strictEqual(exact.deltaMs, 0);
  assert.strictEqual(exact.snapshot.capturedAt, secondTime.toISOString());

  const floorMatch = await getClosestPriceSnapshot(tempDir, new Date('2026-02-28T12:07:00.000Z'), { mode: 'floor' });
  assert.strictEqual(floorMatch.matchType, 'floor');
  assert.strictEqual(floorMatch.snapshot.capturedAt, firstTime.toISOString());

  const fallbackNext = await getClosestPriceSnapshot(tempDir, new Date('2026-02-28T11:00:00.000Z'), { mode: 'floor' });
  assert.strictEqual(fallbackNext.matchType, 'next');
  assert.strictEqual(fallbackNext.snapshot.capturedAt, firstTime.toISOString());

  fs.rmSync(tempDir, { recursive: true, force: true });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
