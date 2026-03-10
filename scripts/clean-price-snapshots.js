#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { getPriceSnapshotDbPath, prunePriceSnapshots } = require('../price-snapshot-store');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = 'true';
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

async function getFileSize(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch (error) {
    if (error && error.code === 'ENOENT') return 0;
    throw error;
  }
}

async function getSnapshotStorageBytes(dbPath) {
  const files = [
    dbPath,
    `${dbPath}-wal`,
    `${dbPath}-shm`
  ];
  const sizes = await Promise.all(files.map((filePath) => getFileSize(filePath)));
  return sizes.reduce((sum, size) => sum + size, 0);
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatUtc8(timestampMs) {
  if (!Number.isFinite(timestampMs)) return '--';
  const date = new Date(timestampMs);
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(date).replace(/\//g, '-');
}

async function main() {
  const args = parseArgs(process.argv);
  const days = Number.parseFloat(args.days);
  const keepDays = Number.isFinite(days) && days > 0 ? days : 1;
  const baseDir = path.resolve(args['base-dir'] || 'db/price');
  const maxAgeMs = Math.floor(keepDays * 24 * 60 * 60 * 1000);
  const dryRun = args['dry-run'] === 'true';
  const vacuum = args['no-vacuum'] !== 'true';
  const dbPath = getPriceSnapshotDbPath(baseDir);

  const beforeBytes = await getSnapshotStorageBytes(dbPath);
  const result = await prunePriceSnapshots(baseDir, {
    maxAgeMs,
    dryRun,
    vacuum
  });
  const afterBytes = await getSnapshotStorageBytes(dbPath);

  if (!result.dbPath) {
    console.log(`未找到快照数据库: ${dbPath}`);
    return;
  }

  console.log(`数据库: ${result.dbPath}`);
  console.log(`保留天数: ${keepDays}`);
  console.log(`清理阈值: ${formatUtc8(result.cutoffMs)} (UTC+8)`);
  console.log(`模式: ${dryRun ? 'dry-run' : 'apply'}`);
  console.log(`空间回收: ${vacuum ? 'VACUUM' : 'skip vacuum'}`);
  console.log(`删除批次: ${result.deletedBatchCount}`);
  console.log(`删除报价: ${result.deletedQuoteCount}`);
  console.log(`清理前: ${result.before ? `${result.before.batchCount} 批 / ${result.before.quoteCount} 条报价` : '--'}`);
  console.log(`清理后: ${result.after ? `${result.after.batchCount} 批 / ${result.after.quoteCount} 条报价` : '--'}`);
  console.log(`文件大小: ${formatBytes(beforeBytes)} -> ${formatBytes(afterBytes)}`);
  console.log(`最早快照: ${result.after ? formatUtc8(result.after.oldestCapturedAtMs) : '--'}`);
  console.log(`最新快照: ${result.after ? formatUtc8(result.after.newestCapturedAtMs) : '--'}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
