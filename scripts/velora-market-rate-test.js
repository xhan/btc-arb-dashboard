#!/usr/bin/env node

const {
  buildDefaultQuoteRequests,
  buildPriceUrl,
  fetchPriceQuote,
  formatRequestAmountDisplay,
  summarizeResults
} = require('./velora-market-api');
const {
  createProxyAgentCache,
  getAgentForProxy,
  parseProxyList,
  selectProxyByIndex
} = require('./rate-test-proxy-utils');

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }

    result[key] = next;
    i += 1;
  }
  return result;
}

/*
 * 参数补充:
 * --proxies <list> 代理列表，逗号分隔。支持 name=url 或 url
 * 示例:
 * --proxies hk01=http://127.0.0.1:18081,hk02=http://127.0.0.1:18082
 */

function toInt(value, defaultValue) {
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : defaultValue;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function printDefaultUrls(requests) {
  console.log('== default urls ==');
  requests.forEach((request, index) => {
    console.log(`${index + 1}. ${request.label}`);
    console.log(buildPriceUrl(request));
  });
}

function formatResultLine(result, index, total) {
  const statusLabel = result.ok ? 'OK' : 'FAIL';
  const requestText = formatRequestAmountDisplay(result.request);
  const amountText = result.destAmountDisplay
    ? `${result.request.destToken.symbol}=${result.destAmountDisplay}`
    : result.errorMessage || '-';
  const proxyText = result.proxyId ? ` proxy=${result.proxyId}` : '';

  return `[${nowTime()}] ${index}/${total} ${requestText} ${statusLabel} status=${result.status} ms=${result.ms}${proxyText} ${amountText}`;
}

async function runScenario({ requests, total, intervalMs, timeoutMs, headers, proxies }) {
  const startedAt = Date.now();
  const tasks = [];
  const proxyAgents = await createProxyAgentCache(proxies);

  for (let i = 0; i < total; i += 1) {
    const request = requests[i % requests.length];
    const proxy = selectProxyByIndex(proxies, i);

    tasks.push((async () => {
      const due = startedAt + i * intervalMs;
      const waitMs = due - Date.now();
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      const result = await fetchPriceQuote(request, {
        timeoutMs,
        headers,
        agent: getAgentForProxy(proxy, proxyAgents)
      });
      result.proxyId = proxy ? proxy.id : 'direct';
      console.log(formatResultLine(result, i + 1, total));
      return result;
    })());
  }

  return Promise.all(tasks);
}

async function main() {
  const args = parseArgs(process.argv);
  const total = toInt(args.cnt, 16);
  const intervalMs = toInt(args['interval-ms'], 300);
  const timeoutMs = toInt(args['timeout-ms'], 10000);
  const requests = buildDefaultQuoteRequests();
  const headers = {};
  const proxies = parseProxyList(args.proxies || '');

  if (args['x-partner']) {
    headers['X-Partner'] = args['x-partner'];
  }

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('invalid --cnt, example: --cnt 16');
  }
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new Error('invalid --interval-ms, example: --interval-ms 300');
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('invalid --timeout-ms, example: --timeout-ms 10000');
  }

  console.log('--- Velora Market Rate Test ---');
  console.log('cnt:', total);
  console.log('intervalMs:', intervalMs);
  console.log('timeoutMs:', timeoutMs);
  console.log('pairs:', requests.length);
  console.log('proxies:', proxies.length > 0 ? proxies.map((item) => `${item.label}=${item.url}`).join(', ') : 'direct');
  if (headers['X-Partner']) {
    console.log('xPartner:', headers['X-Partner']);
  }

  printDefaultUrls(requests);
  console.log('\n== requests ==');

  const results = await runScenario({
    requests,
    total,
    intervalMs,
    timeoutMs,
    headers,
    proxies
  });

  const summary = summarizeResults(results);

  console.log('\n== summary ==');
  console.log('total:', summary.total);
  console.log('successCount:', summary.successCount);
  console.log('failCount:', summary.failCount);
  console.log('successRate:', summary.successRate);
  console.log('successAvgMs:', summary.successAvgMs);

  console.log('\n== pair summary ==');
  summary.byLabel.forEach((item) => {
    console.log(
      `${item.label} | count=${item.count} | share=${item.ratio} | successRate=${item.successRate} | successAvgMs=${item.successAvgMs}`
    );
  });
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
