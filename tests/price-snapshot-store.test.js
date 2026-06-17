const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const {
  normalizePriceSnapshotConfig,
  buildPriceSnapshotEntry,
  getPriceSnapshotDbPath,
  createPriceSnapshotStore,
  appendPriceSnapshot,
  prunePriceSnapshots,
  getNearestPriceSnapshot,
  getClosestPriceSnapshot,
  listRecentChartPairs,
  getChartSeries
} = require('../src/price-snapshots/price-snapshot-store');

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
      fromSymbol: 'WBTC',
      toSymbol: 'WETH',
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
  assert.strictEqual(entry.quotes[0].fromSymbol, 'WBTC');
  assert.strictEqual(entry.quotes[0].toSymbol, 'WETH');

const dbPath = getPriceSnapshotDbPath('db/price');
assert.strictEqual(dbPath, path.join('db/price', 'price-snapshots.db'));

(async () => {
  const reuseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'price-snapshot-store-reuse-'));
  fs.writeFileSync(getPriceSnapshotDbPath(reuseDir), '');
  const openedDbPaths = [];
  const closedDbPaths = [];
  class FakeDatabase {
    constructor(fakeDbPath) {
      this.dbPath = fakeDbPath;
      openedDbPaths.push(fakeDbPath);
    }

    exec() {}

    prepare() {
      return {
        get: () => null,
        all: () => [],
        run: () => ({ lastInsertRowid: 1 })
      };
    }

    close() {
      closedDbPaths.push(this.dbPath);
    }
  }

  const reusableStore = createPriceSnapshotStore(reuseDir, { DatabaseSync: FakeDatabase });
  await reusableStore.getNearestPriceSnapshot(new Date('2026-02-28T12:00:00.000Z'));
  await reusableStore.getClosestPriceSnapshot(new Date('2026-02-28T12:05:00.000Z'));
  assert.strictEqual(openedDbPaths.length, 1);
  assert.deepStrictEqual(closedDbPaths, []);
  reusableStore.close();
  assert.deepStrictEqual(closedDbPaths, [getPriceSnapshotDbPath(reuseDir)]);
  await reusableStore.listRecentChartPairs();
  assert.strictEqual(openedDbPaths.length, 2);
  reusableStore.close();
  fs.rmSync(reuseDir, { recursive: true, force: true });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'price-snapshot-'));
  const firstTime = new Date('2026-02-28T12:00:00.000Z');
  const secondTime = new Date('2026-02-28T12:10:00.000Z');
  const thirdTime = new Date('2026-02-28T12:20:00.000Z');
  const oldTime = new Date('2026-02-28T08:00:00.000Z');

  const savedPath = await appendPriceSnapshot(tempDir, samplePayload, firstTime);
  await appendPriceSnapshot(tempDir, {
    clientCapturedAt: '2026-02-28T12:09:59.000Z',
    quotes: [
      {
        quoteId: 2,
        chain: 'base',
        pair: 'cbBTC/WBTC',
        size: 1,
        fromSymbol: 'cbBTC',
        toSymbol: 'WBTC',
        price: 0.9999
      }
    ]
  }, secondTime);
  await appendPriceSnapshot(tempDir, {
    clientCapturedAt: '2026-02-28T12:19:59.000Z',
    quotes: [
      {
        quoteId: 1,
        chain: 'ethereum',
        pair: 'WBTC/WETH',
        size: 0.1,
        fromSymbol: 'WBTC',
        toSymbol: 'WETH',
        price: 39.5,
        inversePrice: 0.025316
      },
      {
        quoteId: 3,
        chain: 'ethereum',
        pair: 'GHO/USDC',
        size: 1,
        fromSymbol: 'GHO',
        toSymbol: 'USDC',
        price: 0.9987,
        inversePrice: 1.001301
      }
    ]
  }, thirdTime);
  await appendPriceSnapshot(tempDir, {
    quotes: [
      {
        quoteId: 9,
        chain: 'ethereum',
        pair: 'OLD/USDC',
        size: 1,
        fromSymbol: 'OLD',
        toSymbol: 'USDC',
        price: 1
      }
    ]
  }, oldTime);

  assert.strictEqual(savedPath, path.join(tempDir, 'price-snapshots.db'));
  assert.ok(fs.existsSync(savedPath));

  const db = new DatabaseSync(savedPath, { readonly: true });
  const quoteIdIndex = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'index'
      AND name = 'idx_snapshot_quotes_quote_id_snapshot_id'
  `).get();
  db.close();
  assert.ok(quoteIdIndex, '应创建 quote_id 复合索引');

  const nearest = await getNearestPriceSnapshot(tempDir, new Date('2026-02-28T12:05:00.000Z'));
  assert.strictEqual(nearest.capturedAt, firstTime.toISOString());
  assert.strictEqual(nearest.quotes.length, 1);
  assert.strictEqual(nearest.quotes[0].pair, 'WBTC/WETH');
  assert.strictEqual(nearest.quotes[0].size, 0.1);

  const latest = await getNearestPriceSnapshot(tempDir, new Date('2026-02-28T12:59:00.000Z'));
  assert.strictEqual(latest.capturedAt, thirdTime.toISOString());
  assert.strictEqual(latest.quotes[0].pair, 'WBTC/WETH');

  const none = await getNearestPriceSnapshot(tempDir, new Date('2026-02-28T07:00:00.000Z'));
  assert.strictEqual(none, null);

  const exact = await getClosestPriceSnapshot(tempDir, new Date('2026-02-28T12:10:00.000Z'));
  assert.strictEqual(exact.matchType, 'exact');
  assert.strictEqual(exact.deltaMs, 0);
  assert.strictEqual(exact.snapshot.capturedAt, secondTime.toISOString());

  const floorMatch = await getClosestPriceSnapshot(tempDir, new Date('2026-02-28T12:07:00.000Z'), { mode: 'floor' });
  assert.strictEqual(floorMatch.matchType, 'floor');
  assert.strictEqual(floorMatch.snapshot.capturedAt, firstTime.toISOString());

  const fallbackNext = await getClosestPriceSnapshot(tempDir, new Date('2026-02-28T07:00:00.000Z'), { mode: 'floor' });
  assert.strictEqual(fallbackNext.matchType, 'next');
  assert.strictEqual(fallbackNext.snapshot.capturedAt, oldTime.toISOString());

  const recentPairs = await listRecentChartPairs(tempDir);
  assert.strictEqual(recentPairs.length, 5);
  assert.deepStrictEqual(recentPairs[0], {
    key: '3:forward',
    quoteId: 3,
    direction: 'forward',
    chain: 'ethereum',
    fromSymbol: 'GHO',
    toSymbol: 'USDC',
    label: '(eth) GHO -> USDC',
    source: ''
  });
  assert.ok(recentPairs.some((item) => item.key === '1:inverse' && item.label === '(eth) WETH -> WBTC'));
  assert.ok(!recentPairs.some((item) => item.quoteId === 9));

  const forwardSeries = await getChartSeries(tempDir, { quoteId: 1, direction: 'forward' });
  assert.strictEqual(forwardSeries.key, '1:forward');
  assert.strictEqual(forwardSeries.label, '(eth) WBTC -> WETH');
  assert.deepStrictEqual(forwardSeries.points, [
    { time: Math.floor(firstTime.getTime() / 1000), value: 38.12 },
    { time: Math.floor(thirdTime.getTime() / 1000), value: 39.5 }
  ]);

  const inverseSeries = await getChartSeries(tempDir, { quoteId: 1, direction: 'inverse' });
  assert.strictEqual(inverseSeries.label, '(eth) WETH -> WBTC');
  assert.deepStrictEqual(inverseSeries.points, [
    { time: Math.floor(firstTime.getTime() / 1000), value: 0.0262 },
    { time: Math.floor(thirdTime.getTime() / 1000), value: 0.025316 }
  ]);

  const missingSeries = await getChartSeries(tempDir, { quoteId: 999, direction: 'forward' });
  assert.strictEqual(missingSeries, null);

  const dryRun = await prunePriceSnapshots(tempDir, {
    maxAgeMs: 15 * 60 * 1000,
    nowMs: thirdTime.getTime() + 1,
    dryRun: true,
    vacuum: false
  });
  assert.strictEqual(dryRun.deletedBatchCount, 2);
  assert.strictEqual(dryRun.deletedQuoteCount, 2);
  assert.strictEqual(dryRun.before.batchCount, 4);
  assert.strictEqual(dryRun.after.batchCount, 4);

  const pruned = await prunePriceSnapshots(tempDir, {
    maxAgeMs: 15 * 60 * 1000,
    nowMs: thirdTime.getTime() + 1,
    vacuum: false
  });
  assert.strictEqual(pruned.deletedBatchCount, 2);
  assert.strictEqual(pruned.deletedQuoteCount, 2);
  assert.strictEqual(pruned.before.batchCount, 4);
  assert.strictEqual(pruned.after.batchCount, 2);
  assert.strictEqual(pruned.after.quoteCount, 3);

  const remainingPairs = await listRecentChartPairs(tempDir, { windowMs: 30 * 60 * 1000 });
  assert.ok(!remainingPairs.some((item) => item.quoteId === 9));
  assert.ok(remainingPairs.some((item) => item.key === '1:forward'));
  assert.ok(remainingPairs.some((item) => item.key === '3:forward'));

  const removedSeries = await getChartSeries(tempDir, { quoteId: 9, direction: 'forward', windowMs: 30 * 60 * 1000 });
  assert.strictEqual(removedSeries, null);

  const trimmedSeries = await getChartSeries(tempDir, { quoteId: 1, direction: 'forward', windowMs: 30 * 60 * 1000 });
  assert.deepStrictEqual(trimmedSeries.points, [
    { time: Math.floor(thirdTime.getTime() / 1000), value: 39.5 }
  ]);

  fs.rmSync(savedPath, { force: true });
  await appendPriceSnapshot(tempDir, samplePayload, new Date('2026-02-28T13:00:00.000Z'));
  const rebuilt = await getNearestPriceSnapshot(tempDir, new Date('2026-02-28T13:01:00.000Z'));
  assert.strictEqual(rebuilt.capturedAt, '2026-02-28T13:00:00.000Z');
  assert.strictEqual(rebuilt.quotes.length, 1);

  fs.rmSync(tempDir, { recursive: true, force: true });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
