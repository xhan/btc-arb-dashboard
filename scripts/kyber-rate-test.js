#!/usr/bin/env node

/*
 * Kyber URL List Rate Test
 *
 * 用途:
 * - 从 scripts/urls.json 读取 URL 列表
 * - 按指定 rps 和请求总数 cnt 循环请求
 * - 输出状态码分布 / 失败率
 *
 * 请求头:
 * - 只发送 `X-Client-Id`
 *
 * 参数:
 * --rps <n>          请求速率（每秒请求数），默认: 2
 * --cnt <n>          请求总数，默认: 60
 * --x-client-id <id> X-Client-Id，默认: xh-quote-dashboard
 * --proxies <list>   代理列表，逗号分隔。支持 name=url 或 url
 *
 * 示例:
 * node scripts/build-kyber-urls.js
 * node scripts/kyber-rate-test.js --rps 3 --cnt 120 --x-client-id kyber-client-quote
 * node scripts/kyber-rate-test.js --rps 3 --cnt 120 --proxies hk01=http://127.0.0.1:18081,hk02=http://127.0.0.1:18082
 */

const fetchLib = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { readUrlsJsonFile } = require('./kyber-url-list');
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
    } else {
      result[key] = next;
      i += 1;
    }
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

async function sendRequest(url, headers, timeoutMs, agent) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchLib(url, { headers, signal: controller.signal, agent });
    const text = await response.text();
    let msg = '';

    try {
      const data = JSON.parse(text);
      msg = data.message || data.error || data.code || '';
    } catch {
      msg = text.slice(0, 160);
    }

    return {
      ok: response.ok,
      status: response.status,
      ms: Date.now() - startedAt,
      msg
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      msg: error.name === 'AbortError' ? 'timeout' : error.message
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runScenario({ rps, total, urls, clientId, timeoutMs, proxies }) {
  const intervalMs = Math.max(1, Math.round(1000 / rps));
  const startedAt = Date.now();
  const tasks = [];
  const proxyAgents = await createProxyAgentCache(proxies);

  for (let i = 0; i < total; i += 1) {
    const url = urls[i % urls.length];
    const proxy = selectProxyByIndex(proxies, i);

    tasks.push((async () => {
      const due = startedAt + i * intervalMs;
      const wait = due - Date.now();
      if (wait > 0) await sleep(wait);

      const headers = {
        'X-Client-Id': clientId
      };

      const result = await sendRequest(url, headers, timeoutMs, getAgentForProxy(proxy, proxyAgents));
      return {
        ...result,
        proxyId: proxy ? proxy.id : 'direct'
      };
    })());
  }

  const results = await Promise.all(tasks);
  const statusCount = {};
  const failByReason = {};
  const byProxy = {};

  for (const r of results) {
    statusCount[r.status] = (statusCount[r.status] || 0) + 1;
    byProxy[r.proxyId] = (byProxy[r.proxyId] || 0) + 1;
    if (!r.ok) {
      const key = `${r.proxyId}:${r.status}:${r.msg}`;
      failByReason[key] = (failByReason[key] || 0) + 1;
    }
  }

  const fail = results.filter((r) => !r.ok);
  const avgMs = Math.round(results.reduce((sum, r) => sum + r.ms, 0) / Math.max(1, results.length));

  return {
    rps,
    intervalMs,
    total,
    avgMs,
    statusCount,
    byProxy,
    failCount: fail.length,
    failRate: Number((fail.length / Math.max(1, results.length)).toFixed(4)),
    failByReason,
    failSample: fail.slice(0, 8)
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const rps = Number.parseFloat(args.rps || '2');
  const total = toInt(args.cnt, 60);
  const timeoutMs = 8000;
  const clientId = args['x-client-id'] || 'xh-quote-dashboard';
  const proxies = parseProxyList(args.proxies || '');
  const urlsPath = path.resolve('scripts/urls.json');
  const urls = readUrlsJsonFile(fs, urlsPath);

  if (!Number.isFinite(rps) || rps <= 0) {
    throw new Error('invalid --rps, example: --rps 3');
  }
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('invalid --cnt, example: --cnt 120');
  }

  console.log('--- Kyber URL List Rate Test ---');
  console.log('urls:', urlsPath);
  console.log('clientId:', clientId);
  console.log('proxies:', proxies.length > 0 ? proxies.map((item) => `${item.label}=${item.url}`).join(', ') : 'direct');
  console.log('usableUrls:', urls.length);
  console.log('rps:', rps);
  console.log('cnt:', total);

  const result = await runScenario({
    rps,
    total,
    urls,
    clientId,
    timeoutMs,
    proxies
  });

  console.log('\n== result ==');
  console.log('intervalMs:', result.intervalMs, 'total:', result.total, 'avgMs:', result.avgMs);
  console.log('statusCount:', result.statusCount);
  console.log('byProxy:', result.byProxy);
  console.log('failCount:', result.failCount, 'failRate:', result.failRate);

  if (result.failCount > 0) {
    console.log('failByReason:', result.failByReason);
    console.log('failSample:', result.failSample);
  }
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
