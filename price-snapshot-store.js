const fs = require('fs').promises;
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const {
  buildChartPairKey,
  buildChartPairLabel
} = require('./charts-utils');

function normalizePriceSnapshotConfig(configMore = {}) {
  const enabled = configMore.enablePriceSnapshot === true;
  const rawInterval = Number.parseInt(configMore.priceSnapshotIntervalSec, 10);
  const intervalSec = Number.isFinite(rawInterval) && rawInterval > 0 ? rawInterval : 10;
  return { enabled, intervalSec };
}

function sanitizeQuotes(quotes) {
  if (!Array.isArray(quotes)) return [];
  return quotes
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      quoteId: item.quoteId ?? null,
      categoryId: item.categoryId ?? null,
      categoryName: item.categoryName ?? '',
      chain: item.chain ?? '',
      pair: item.pair ?? '',
      size: item.size ?? null,
      preferredSource: item.preferredSource ?? '',
      usedSource: item.usedSource ?? '',
      fromToken: item.fromToken ?? '',
      toToken: item.toToken ?? '',
      fromSymbol: item.fromSymbol ?? '',
      toSymbol: item.toSymbol ?? '',
      price: item.price ?? null,
      inversePrice: item.inversePrice ?? null,
      resultText: item.resultText ?? '',
      inversePair: item.inversePair ?? '',
      inverseResultText: item.inverseResultText ?? ''
    }));
}

function buildPriceSnapshotEntry(payload = {}, now = new Date()) {
  return {
    capturedAt: now.toISOString(),
    capturedAtMs: now.getTime(),
    clientCapturedAt: payload.clientCapturedAt || null,
    quotes: sanitizeQuotes(payload.quotes)
  };
}

function getPriceSnapshotDbPath(baseDir) {
  return path.join(baseDir, 'price-snapshots.db');
}

function ensureSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS snapshot_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      captured_at TEXT NOT NULL,
      captured_at_ms INTEGER NOT NULL,
      client_captured_at TEXT,
      quote_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_snapshot_batches_captured_at_ms
      ON snapshot_batches (captured_at_ms);

    CREATE TABLE IF NOT EXISTS snapshot_quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      quote_id INTEGER,
      category_id INTEGER,
      category_name TEXT,
      chain TEXT,
      pair TEXT,
      size REAL,
      preferred_source TEXT,
      used_source TEXT,
      from_token TEXT,
      to_token TEXT,
      from_symbol TEXT,
      to_symbol TEXT,
      price REAL,
      inverse_price REAL,
      result_text TEXT,
      inverse_pair TEXT,
      inverse_result_text TEXT,
      FOREIGN KEY (snapshot_id) REFERENCES snapshot_batches(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_snapshot_quotes_snapshot_id
      ON snapshot_quotes (snapshot_id);
    CREATE INDEX IF NOT EXISTS idx_snapshot_quotes_chain_pair
      ON snapshot_quotes (chain, pair);
  `);
}

function withDatabase(dbPath, fn) {
  const db = new DatabaseSync(dbPath);
  try {
    ensureSchema(db);
    return fn(db);
  } finally {
    db.close();
  }
}

function getLatestSnapshotMeta(db) {
  return db.prepare(`
    SELECT id, captured_at_ms
    FROM snapshot_batches
    ORDER BY captured_at_ms DESC
    LIMIT 1
  `).get();
}

function getSnapshotByBatchId(db, batchId) {
  const batch = db.prepare(`
    SELECT id, captured_at, captured_at_ms, client_captured_at, quote_count
    FROM snapshot_batches
    WHERE id = ?
  `).get(batchId);

  if (!batch) return null;

  const quotes = db.prepare(`
    SELECT
      quote_id AS quoteId,
      category_id AS categoryId,
      category_name AS categoryName,
      chain,
      pair,
      size,
      preferred_source AS preferredSource,
      used_source AS usedSource,
      from_token AS fromToken,
      to_token AS toToken,
      from_symbol AS fromSymbol,
      to_symbol AS toSymbol,
      price,
      inverse_price AS inversePrice,
      result_text AS resultText,
      inverse_pair AS inversePair,
      inverse_result_text AS inverseResultText
    FROM snapshot_quotes
    WHERE snapshot_id = ?
    ORDER BY id ASC
  `).all(batch.id);

  return {
    snapshotId: batch.id,
    capturedAt: batch.captured_at,
    capturedAtMs: batch.captured_at_ms,
    clientCapturedAt: batch.client_captured_at,
    quoteCount: batch.quote_count,
    quotes
  };
}

async function appendPriceSnapshot(baseDir, payload = {}, now = new Date()) {
  await fs.mkdir(baseDir, { recursive: true });
  const dbPath = getPriceSnapshotDbPath(baseDir);
  const entry = buildPriceSnapshotEntry(payload, now);

  withDatabase(dbPath, (db) => {
    const insertBatch = db.prepare(`
      INSERT INTO snapshot_batches (captured_at, captured_at_ms, client_captured_at, quote_count)
      VALUES (?, ?, ?, ?)
    `);
    const insertQuote = db.prepare(`
      INSERT INTO snapshot_quotes (
        snapshot_id, quote_id, category_id, category_name, chain, pair, size,
        preferred_source, used_source, from_token, to_token, from_symbol, to_symbol,
        price, inverse_price, result_text, inverse_pair, inverse_result_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    try {
      const batchResult = insertBatch.run(
        entry.capturedAt,
        entry.capturedAtMs,
        entry.clientCapturedAt,
        entry.quotes.length
      );
      const snapshotId = Number(batchResult.lastInsertRowid);

      for (const quote of entry.quotes) {
        insertQuote.run(
          snapshotId,
          quote.quoteId,
          quote.categoryId,
          quote.categoryName,
          quote.chain,
          quote.pair,
          quote.size,
          quote.preferredSource,
          quote.usedSource,
          quote.fromToken,
          quote.toToken,
          quote.fromSymbol,
          quote.toSymbol,
          quote.price,
          quote.inversePrice,
          quote.resultText,
          quote.inversePair,
          quote.inverseResultText
        );
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });

  return dbPath;
}

async function getNearestPriceSnapshot(baseDir, targetTime = new Date()) {
  const dbPath = getPriceSnapshotDbPath(baseDir);
  try {
    await fs.access(dbPath);
  } catch {
    return null;
  }

  const targetMs = targetTime instanceof Date ? targetTime.getTime() : new Date(targetTime).getTime();
  if (!Number.isFinite(targetMs)) return null;

  return withDatabase(dbPath, (db) => {
    const batch = db.prepare(`
      SELECT id, captured_at, captured_at_ms, client_captured_at, quote_count
      FROM snapshot_batches
      WHERE captured_at_ms <= ?
      ORDER BY captured_at_ms DESC
      LIMIT 1
    `).get(targetMs);

    if (!batch) return null;
    return getSnapshotByBatchId(db, batch.id);
  });
}

async function getClosestPriceSnapshot(baseDir, targetTime = new Date(), options = {}) {
  const dbPath = getPriceSnapshotDbPath(baseDir);
  try {
    await fs.access(dbPath);
  } catch {
    return null;
  }

  const targetMs = targetTime instanceof Date ? targetTime.getTime() : new Date(targetTime).getTime();
  if (!Number.isFinite(targetMs)) return null;

  const mode = ['floor', 'ceil', 'nearest'].includes(options.mode) ? options.mode : 'floor';
  const maxGapMs = Number.isFinite(options.maxGapMs) && options.maxGapMs >= 0 ? options.maxGapMs : null;

  return withDatabase(dbPath, (db) => {
    const before = db.prepare(`
      SELECT id, captured_at_ms
      FROM snapshot_batches
      WHERE captured_at_ms <= ?
      ORDER BY captured_at_ms DESC
      LIMIT 1
    `).get(targetMs);

    const after = db.prepare(`
      SELECT id, captured_at_ms
      FROM snapshot_batches
      WHERE captured_at_ms >= ?
      ORDER BY captured_at_ms ASC
      LIMIT 1
    `).get(targetMs);

    let chosen = null;
    let matchType = '';

    if (before && before.captured_at_ms === targetMs) {
      chosen = before;
      matchType = 'exact';
    } else if (mode === 'ceil') {
      chosen = after || before;
      matchType = after ? 'ceil' : (before ? 'floor' : '');
    } else if (mode === 'nearest') {
      if (before && after) {
        const beforeGap = Math.abs(targetMs - before.captured_at_ms);
        const afterGap = Math.abs(after.captured_at_ms - targetMs);
        chosen = beforeGap <= afterGap ? before : after;
        matchType = beforeGap <= afterGap ? 'floor' : 'ceil';
      } else {
        chosen = before || after;
        matchType = before ? 'floor' : (after ? 'ceil' : '');
      }
    } else {
      chosen = before || after;
      matchType = before ? 'floor' : (after ? 'next' : '');
    }

    if (!chosen) return null;

    const deltaMs = Math.abs(targetMs - chosen.captured_at_ms);
    if (maxGapMs !== null && deltaMs > maxGapMs) {
      return null;
    }

    const snapshot = getSnapshotByBatchId(db, chosen.id);
    if (!snapshot) return null;

    return {
      requestedAt: new Date(targetMs).toISOString(),
      requestedAtMs: targetMs,
      matchType,
      deltaMs,
      snapshot
    };
  });
}

async function openSnapshotDatabase(baseDir) {
  const dbPath = getPriceSnapshotDbPath(baseDir);
  try {
    await fs.access(dbPath);
  } catch {
    return null;
  }
  return dbPath;
}

function buildChartPairEntry(row, direction, latestCapturedAtMs) {
  const isInverse = direction === 'inverse';
  const fromSymbol = isInverse ? row.toSymbol : row.fromSymbol;
  const toSymbol = isInverse ? row.fromSymbol : row.toSymbol;
  return {
    key: buildChartPairKey(row.quoteId, direction),
    quoteId: row.quoteId,
    direction,
    chain: row.chain || '',
    fromSymbol: fromSymbol || '',
    toSymbol: toSymbol || '',
    label: buildChartPairLabel({
      chain: row.chain,
      fromSymbol,
      toSymbol
    }),
    source: row.usedSource || row.preferredSource || '',
    latestCapturedAtMs
  };
}

async function listRecentChartPairs(baseDir, options = {}) {
  const dbPath = await openSnapshotDatabase(baseDir);
  if (!dbPath) return [];

  const windowMs = Number.isFinite(options.windowMs) && options.windowMs > 0
    ? options.windowMs
    : 2 * 60 * 60 * 1000;

  return withDatabase(dbPath, (db) => {
    const latest = getLatestSnapshotMeta(db);
    if (!latest) return [];

    const sinceMs = latest.captured_at_ms - windowMs;
    const rows = db.prepare(`
      SELECT
        q.quote_id AS quoteId,
        q.chain AS chain,
        q.from_symbol AS fromSymbol,
        q.to_symbol AS toSymbol,
        q.price AS price,
        q.inverse_price AS inversePrice,
        q.used_source AS usedSource,
        q.preferred_source AS preferredSource,
        b.captured_at_ms AS capturedAtMs
      FROM snapshot_quotes q
      INNER JOIN snapshot_batches b
        ON b.id = q.snapshot_id
      WHERE b.captured_at_ms >= ?
      ORDER BY b.captured_at_ms DESC, q.id DESC
    `).all(sinceMs);

    const pairMap = new Map();
    for (const row of rows) {
      if (!Number.isFinite(row.quoteId) || !row.fromSymbol || !row.toSymbol) continue;

      if (typeof row.price === 'number') {
        const key = buildChartPairKey(row.quoteId, 'forward');
        if (!pairMap.has(key)) {
          pairMap.set(key, buildChartPairEntry(row, 'forward', row.capturedAtMs));
        }
      }

      if (typeof row.inversePrice === 'number') {
        const key = buildChartPairKey(row.quoteId, 'inverse');
        if (!pairMap.has(key)) {
          pairMap.set(key, buildChartPairEntry(row, 'inverse', row.capturedAtMs));
        }
      }
    }

    return Array.from(pairMap.values())
      .sort((left, right) => {
        if (right.latestCapturedAtMs !== left.latestCapturedAtMs) {
          return right.latestCapturedAtMs - left.latestCapturedAtMs;
        }
        if (left.label !== right.label) {
          return left.label.localeCompare(right.label);
        }
        if (left.direction !== right.direction) {
          return left.direction === 'forward' ? -1 : 1;
        }
        return left.quoteId - right.quoteId;
      })
      .map(({ latestCapturedAtMs, ...item }) => item);
  });
}

async function getChartSeries(baseDir, options = {}) {
  const dbPath = await openSnapshotDatabase(baseDir);
  if (!dbPath) return null;

  const quoteId = Number(options.quoteId);
  if (!Number.isFinite(quoteId)) return null;

  const direction = options.direction === 'inverse' ? 'inverse' : 'forward';
  const priceField = direction === 'inverse' ? 'inversePrice' : 'price';
  const windowMs = Number.isFinite(options.windowMs) && options.windowMs > 0
    ? options.windowMs
    : 2 * 60 * 60 * 1000;

  return withDatabase(dbPath, (db) => {
    const latest = getLatestSnapshotMeta(db);
    if (!latest) return null;

    const sinceMs = latest.captured_at_ms - windowMs;
    const rows = db.prepare(`
      SELECT
        q.quote_id AS quoteId,
        q.chain AS chain,
        q.from_symbol AS fromSymbol,
        q.to_symbol AS toSymbol,
        q.price AS price,
        q.inverse_price AS inversePrice,
        q.used_source AS usedSource,
        q.preferred_source AS preferredSource,
        b.captured_at_ms AS capturedAtMs
      FROM snapshot_quotes q
      INNER JOIN snapshot_batches b
        ON b.id = q.snapshot_id
      WHERE q.quote_id = ?
        AND b.captured_at_ms >= ?
      ORDER BY b.captured_at_ms ASC, q.id ASC
    `).all(quoteId, sinceMs);

    if (!rows.length) return null;

    const points = rows
      .filter((row) => typeof row[priceField] === 'number')
      .map((row) => ({
        time: Math.floor(row.capturedAtMs / 1000),
        value: row[priceField]
      }));

    if (!points.length) return null;

    const latestRow = rows[rows.length - 1];
    const fromSymbol = direction === 'inverse' ? latestRow.toSymbol : latestRow.fromSymbol;
    const toSymbol = direction === 'inverse' ? latestRow.fromSymbol : latestRow.toSymbol;

    return {
      key: buildChartPairKey(quoteId, direction),
      quoteId,
      direction,
      chain: latestRow.chain || '',
      fromSymbol: fromSymbol || '',
      toSymbol: toSymbol || '',
      label: buildChartPairLabel({
        chain: latestRow.chain,
        fromSymbol,
        toSymbol
      }),
      source: latestRow.usedSource || latestRow.preferredSource || '',
      points
    };
  });
}

module.exports = {
  normalizePriceSnapshotConfig,
  buildPriceSnapshotEntry,
  getPriceSnapshotDbPath,
  appendPriceSnapshot,
  getNearestPriceSnapshot,
  getClosestPriceSnapshot,
  listRecentChartPairs,
  getChartSeries
};
