#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const {
  buildDefiLlamaProxyRequest,
  normalizeBrowserProxyOptions,
  summarizeBrowserProxyResults
} = require('./defillama-browser-proxy-test-utils');

const SWAP_PAGE_URL = 'https://swap.defillama.com/?chain=ethereum&from=0xdac17f958d2ee523a2206206994597c13d831ec7&to=0xc139190f447e929f090edeb554d95abb8b18ac1c&tab=swap';

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ].filter(Boolean);

  return candidates.find((item) => fs.existsSync(item));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`invalid JSON from ${url}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForCdp(port, timeoutMs = 15000) {
  const startedAt = Date.now();
  const url = `http://127.0.0.1:${port}/json/version`;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await requestJson(url);
    } catch {
      await sleep(200);
    }
  }
  throw new Error('Chrome DevTools endpoint did not start in time');
}

async function createPageTarget(port, pageUrl) {
  const target = await requestJson(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(pageUrl)}`,
    { method: 'PUT' }
  );
  if (!target.webSocketDebuggerUrl) {
    throw new Error('Chrome did not return a page websocket endpoint');
  }
  return target;
}

function connectCdp(wsUrl) {
  let nextId = 1;
  const pending = new Map();
  const ws = new WebSocket(wsUrl);

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(message.error.message || JSON.stringify(message.error)));
      return;
    }
    resolve(message.result);
  });

  function waitOpen() {
    return new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
  }

  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function close() {
    ws.close();
  }

  return { waitOpen, send, close };
}

async function launchChrome(options) {
  const chromePath = getChromePath();
  if (!chromePath) {
    throw new Error('找不到 Chrome。可设置 CHROME_PATH，或安装 Google Chrome。');
  }

  const port = await getFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'defillama-browser-proxy-'));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--window-size=1200,900',
    'about:blank'
  ];

  if (options.headless) {
    args.unshift('--headless=new');
  }

  const child = spawn(chromePath, args, {
    stdio: ['ignore', 'ignore', 'pipe']
  });

  child.stderr.on('data', (chunk) => {
    const line = chunk.toString().trim();
    if (line && options.verbose) {
      console.error(`[chrome] ${line}`);
    }
  });

  await waitForCdp(port);
  const pageTarget = await createPageTarget(port, options.pageUrl || SWAP_PAGE_URL);
  const cdp = connectCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.waitOpen();
  await cdp.send('Runtime.enable');

  return {
    cdp,
    port,
    userDataDir,
    close: async () => {
      try {
        cdp.close();
      } catch {}
      child.kill();
      await sleep(300);
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  };
}

function buildBrowserFetchExpression(httpRequest, timeoutMs) {
  return `(${async function runFetch(request, timeout) {
    const startedAt = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(request.url, {
        method: request.method,
        body: request.body,
        signal: controller.signal
      });
      const text = await response.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {}
      return {
        ok: response.ok,
        status: response.status,
        ms: Math.round(performance.now() - startedAt),
        amountReturned: json && json.amountReturned,
        estimatedGas: json && json.estimatedGas,
        errorMessage: json && (json.error || json.message) || (response.ok ? '' : text.slice(0, 160)),
        responseText: text.slice(0, 300)
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        ms: Math.round(performance.now() - startedAt),
        errorMessage: error && error.name === 'AbortError' ? 'timeout' : String(error && error.message || error),
        responseText: ''
      };
    } finally {
      clearTimeout(timer);
    }
  }})(${JSON.stringify(httpRequest)}, ${Number(timeoutMs)})`;
}

async function runOnce(cdp, httpRequest, timeoutMs) {
  const result = await cdp.send('Runtime.evaluate', {
    expression: buildBrowserFetchExpression(httpRequest, timeoutMs),
    awaitPromise: true,
    returnByValue: true
  });
  return result.result && result.result.value
    ? result.result.value
    : { ok: false, status: 0, ms: 0, errorMessage: 'empty Runtime.evaluate result' };
}

function printProgress(result, index, startedAt, options) {
  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  const status = result.ok ? 'OK' : 'FAIL';
  const detail = result.ok
    ? `amountReturned=${result.amountReturned || '-'} gas=${result.estimatedGas || '-'}`
    : result.errorMessage || '-';
  console.log([
    `[${index}/${options.total}]`,
    `elapsed=${elapsedSec}s`,
    status,
    `status=${result.status}`,
    `ms=${result.ms}`,
    detail
  ].join(' | '));
}

async function main() {
  const args = parseArgs(process.argv);
  const durationMs = args['duration-min']
    ? String(Number(args['duration-min']) * 60 * 1000)
    : args['duration-ms'];
  const options = normalizeBrowserProxyOptions({
    intervalMs: args['interval-ms'],
    durationMs,
    timeoutMs: args['timeout-ms'],
    protocol: args.protocol,
    chain: args.chain,
    slippage: args.slippage
  });
  const logEvery = Math.max(1, Number.parseInt(args['log-every'] || '20', 10));
  const headless = args.headless === 'true';
  const httpRequest = buildDefiLlamaProxyRequest(options);
  const outputPath = args.output || path.join(
    os.tmpdir(),
    `defillama-browser-proxy-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
  );

  console.log('--- DefiLlama Browser Proxy Test ---');
  console.log('protocol:', options.protocol);
  console.log('chain:', options.chain);
  console.log('intervalMs:', options.intervalMs);
  console.log('durationMs:', options.durationMs);
  console.log('plannedTotal:', options.total);
  console.log('timeoutMs:', options.timeoutMs);
  console.log('headless:', headless);
  console.log('output:', outputPath);

  const browser = await launchChrome({ headless, verbose: args.verbose === 'true' });
  const results = [];
  const startedAt = Date.now();
  const deadline = startedAt + options.durationMs;
  fs.writeFileSync(outputPath, '');

  try {
    await sleep(3000);
    const inFlight = new Set();
    for (let i = 0; i < options.total && Date.now() < deadline; i += 1) {
      const due = startedAt + i * options.intervalMs;
      const waitMs = due - Date.now();
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      const index = i + 1;
      const task = runOnce(browser.cdp, httpRequest, options.timeoutMs)
        .then((result) => {
          result.index = index;
          result.at = new Date().toISOString();
          results.push(result);
          fs.appendFileSync(outputPath, `${JSON.stringify(result)}\n`);

          if (!result.ok || index % logEvery === 0 || index === 1) {
            printProgress(result, index, startedAt, options);
          }
        })
        .catch((error) => {
          const result = {
            index,
            at: new Date().toISOString(),
            ok: false,
            status: 0,
            ms: 0,
            errorMessage: error.message
          };
          results.push(result);
          fs.appendFileSync(outputPath, `${JSON.stringify(result)}\n`);
          printProgress(result, index, startedAt, options);
        })
        .finally(() => {
          inFlight.delete(task);
        });
      inFlight.add(task);
    }
    await Promise.allSettled([...inFlight]);
  } finally {
    await browser.close();
  }

  const summary = summarizeBrowserProxyResults(results);
  console.log('\n== summary ==');
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  buildBrowserFetchExpression,
  launchChrome,
  parseArgs,
  runOnce
};
