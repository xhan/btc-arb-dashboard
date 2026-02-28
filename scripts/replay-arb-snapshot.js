#!/usr/bin/env node

/*
 * 按时间点回放套利路径
 *
 * 输出:
 * - 直接输出到 stdout
 * - 可选 text / json
 *
 * 默认匹配策略:
 * - floor: 优先取 <= 查询时间 的最近快照（避免“偷看未来”）
 * - 如果 floor 没有历史快照，会自动回退到下一条快照（matchType=next）
 *
 * 时间输入默认按 UTC+8 解析（如果没带时区）
 *
 * 用法:
 * node scripts/replay-arb-snapshot.js --at 2026-03-01 00:00:00
 * node scripts/replay-arb-snapshot.js --at 2026-03-01T00:00:00+08:00 --mode nearest
 * node scripts/replay-arb-snapshot.js --at 2026-03-01 00:00:00 --format json --max-gap-sec 30
 */

const { getClosestPriceSnapshot } = require('../price-snapshot-store');
const { buildReplayFromSnapshot, renderReplayText } = require('../price-snapshot-replay');
const { parseUtc8Input } = require('../time-utils');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = 'true';
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.at) {
    throw new Error('缺少 --at，例如: --at 2026-03-01 00:00:00');
  }

  const requestedAt = parseUtc8Input(args.at);
  if (Number.isNaN(requestedAt.getTime())) {
    throw new Error(`无效的 --at: ${args.at}`);
  }

  const mode = ['floor', 'nearest', 'ceil'].includes(args.mode) ? args.mode : 'floor';
  const format = String(args.format || 'text').toLowerCase() === 'json' ? 'json' : 'text';
  const maxGapSec = Number.parseInt(args['max-gap-sec'], 10);
  const maxGapMs = Number.isFinite(maxGapSec) && maxGapSec > 0 ? maxGapSec * 1000 : null;
  const baseDir = path.resolve(args['base-dir'] || 'db/price');

  const selection = await getClosestPriceSnapshot(baseDir, requestedAt, { mode, maxGapMs });
  if (!selection) {
    throw new Error('未找到满足条件的快照（可能没有数据，或超过 max-gap-sec）');
  }

  const replay = buildReplayFromSnapshot(selection);
  if (format === 'json') {
    console.log(JSON.stringify(replay, null, 2));
    return;
  }

  console.log(renderReplayText(replay));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
