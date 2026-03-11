#!/usr/bin/env node

const {
  DEFAULT_USER_AGENT,
  buildDefaultDefiLlamaRateRequests,
  buildDefiLlamaHttpRequest,
  sendRateRequest,
  summarizeRateResults
} = require('./defillama-rate-test-utils');

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('-')) continue;

    const key = arg.startsWith('--') ? arg.slice(2) : arg.slice(1);
    const next = argv[i + 1];
    if (!next || next.startsWith('-')) {
      result[key] = 'true';
      continue;
    }

    result[key] = next;
    i += 1;
  }
  return result;
}

function toInt(value, defaultValue) {
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : defaultValue;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseProviderArg(value) {
  const normalized = String(value || 'all').toLowerCase();
  if (normalized === 'all') return ['paraswap', 'kyberswap'];
  if (normalized === 'paraswap' || normalized === 'kyberswap') return [normalized];
  throw new Error('invalid --provider, use paraswap|kyberswap|all');
}

function formatResultLine(result, index, total) {
  const statusText = result.ok ? 'OK' : 'FAIL';
  const detail = result.ok ? result.responseSummary || result.responseText || '-' : result.errorMessage || result.responseText || '-';
  return [
    `[${index}/${total}]`,
    result.provider,
    result.label,
    statusText,
    `status=${result.status}`,
    `ms=${result.ms}`,
    detail
  ].join(' | ');
}

async function runScenario(options) {
  const results = [];
  const log = options.logger || console.log;
  const buildRequest = options.buildRequest || buildDefiLlamaHttpRequest;
  const sendRequest = options.sendRequest || sendRateRequest;
  const startedAt = Date.now();

  for (let i = 0; i < options.total; i += 1) {
    const request = options.requests[i % options.requests.length];
    const provider = options.providers[i % options.providers.length];
    const due = startedAt + i * options.intervalMs;
    const waitMs = due - Date.now();
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    const httpRequest = buildRequest(request, {
      provider,
      userAgent: options.userAgent,
      clientId: 'llamaswap'
    });
    const result = await sendRequest(httpRequest, { timeoutMs: options.timeoutMs });
    log(formatResultLine(result, i + 1, options.total));
    results.push(result);
  }

  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const total = toInt(args.cnt, 60);
  const intervalMs = toInt(args['interval-ms'], 300);
  const timeoutMs = toInt(args['timeout-ms'], 10000);
  const providers = parseProviderArg(args.provider);
  const userAgent = args['user-agent'] || DEFAULT_USER_AGENT;
  const requests = buildDefaultDefiLlamaRateRequests();

  if (Object.prototype.hasOwnProperty.call(args, 'hide-ip')) {
    throw new Error('--hide-ip has been removed; this script only tests direct requests');
  }

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('invalid --cnt, example: --cnt 120');
  }
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new Error('invalid --interval-ms, example: --interval-ms 300');
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('invalid --timeout-ms, example: --timeout-ms 10000');
  }

  console.log('--- DefiLlama Rate Test ---');
  console.log('cnt:', total);
  console.log('intervalMs:', intervalMs);
  console.log('timeoutMs:', timeoutMs);
  console.log('providers:', providers.join(','));
  console.log('userAgent:', userAgent);
  console.log('pairs:', requests.map((item) => item.label).join(' | '));

  const results = await runScenario({
    total,
    intervalMs,
    timeoutMs,
    providers,
    requests,
    userAgent
  });

  const summary = summarizeRateResults(results);

  console.log('\n== summary ==');
  console.log('total:', summary.total);
  console.log('successCount:', summary.successCount);
  console.log('failCount:', summary.failCount);
  console.log('successRate:', summary.successRate);
  console.log('avgMs:', summary.avgMs);
  console.log('statusCount:', summary.statusCount);

  console.log('\n== by provider ==');
  Object.entries(summary.byProvider).forEach(([key, value]) => {
    console.log(`${key} | total=${value.total} | success=${value.successCount} | fail=${value.failCount}`);
  });

  if (summary.failSample.length > 0) {
    console.log('\n== fail sample ==');
    summary.failSample.forEach((item) => {
      console.log(`${item.provider} | ${item.label} | status=${item.status} | ${item.errorMessage}`);
    });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('ERROR:', error.message);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  parseProviderArg,
  formatResultLine,
  runScenario
};
