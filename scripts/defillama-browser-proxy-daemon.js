#!/usr/bin/env node

const http = require('http');

const { buildDefiLlamaProxyRequest } = require('./defillama-browser-proxy-test-utils');
const { launchChrome, parseArgs, runOnce } = require('./defillama-browser-proxy-test');

const DEFAULT_USER_ADDRESS = '0x0000000000000000000000000000000000000000';

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAddress(value, fieldName) {
  const text = normalizeString(value).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(text)) {
    throw new Error(`${fieldName} 地址无效`);
  }
  return text;
}

function normalizeToken(body, prefix) {
  const objectToken = body[`${prefix}Token`] && typeof body[`${prefix}Token`] === 'object'
    ? body[`${prefix}Token`]
    : null;
  const address = objectToken ? objectToken.address : body[`${prefix}Token`];
  if (!address) {
    throw new Error(`缺少 ${prefix}Token`);
  }

  const decimals = Number(objectToken ? objectToken.decimals : body[`${prefix}Decimals`]);
  if (!Number.isFinite(decimals) || decimals < 0) {
    throw new Error(`缺少 ${prefix}Decimals`);
  }

  return {
    address: normalizeAddress(address, `${prefix}Token`),
    decimals,
    symbol: normalizeString(objectToken ? objectToken.symbol : body[`${prefix}Symbol`]) || 'UNKNOWN'
  };
}

function normalizeDaemonOptions(options = {}) {
  return {
    host: normalizeString(options.host) || '127.0.0.1',
    port: toPositiveInt(options.port, 18081),
    timeoutMs: toPositiveInt(options.timeoutMs, 10000),
    headless: options.headless === true,
    verbose: options.verbose === true
  };
}

function normalizeQuoteBody(body = {}) {
  const raw = body && typeof body === 'object' ? body : {};
  const amountRaw = normalizeString(raw.amountRaw);
  if (!amountRaw || !/^\d+$/.test(amountRaw)) {
    throw new Error('缺少 amountRaw');
  }

  return {
    protocol: normalizeString(raw.protocol) || 'ParaSwap',
    chain: normalizeString(raw.chain) || 'ethereum',
    fromToken: normalizeToken(raw, 'from'),
    toToken: normalizeToken(raw, 'to'),
    amountRaw,
    slippage: normalizeString(raw.slippage) || '0.5',
    userAddress: normalizeAddress(raw.userAddress || DEFAULT_USER_ADDRESS, 'userAddress')
  };
}

function createDaemonState(options = {}) {
  return {
    startedAt: new Date().toISOString(),
    chromePort: options.chromePort || null,
    inFlight: 0,
    stats: {
      total: 0,
      success: 0,
      fail: 0
    },
    lastError: ''
  };
}

async function handleQuoteRequest({ body, state, runQuote }) {
  let quote;
  try {
    quote = normalizeQuoteBody(body);
  } catch (error) {
    return {
      statusCode: 400,
      payload: { ok: false, error: error.message }
    };
  }

  state.inFlight += 1;
  state.stats.total += 1;
  try {
    const httpRequest = buildDefiLlamaProxyRequest(quote);
    const result = await runQuote(httpRequest, quote);
    const ok = result && result.ok === true && result.amountReturned;
    if (ok) {
      state.stats.success += 1;
      state.lastError = '';
    } else {
      state.stats.fail += 1;
      state.lastError = result && result.errorMessage || 'Llama-ParaSwap proxy quote failed';
    }

    return {
      statusCode: ok ? 200 : 502,
      payload: {
        ok: !!ok,
        source: 'Llama-ParaSwap',
        protocol: quote.protocol,
        chain: quote.chain,
        amountReturned: result && result.amountReturned,
        estimatedGas: result && result.estimatedGas,
        status: result && result.status,
        ms: result && result.ms,
        error: ok ? '' : state.lastError
      }
    };
  } catch (error) {
    state.stats.fail += 1;
    state.lastError = error.message;
    return {
      statusCode: 502,
      payload: { ok: false, error: error.message }
    };
  } finally {
    state.inFlight -= 1;
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function createDaemonServer({ state, runQuote }) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        startedAt: state.startedAt,
        chromePort: state.chromePort,
        inFlight: state.inFlight,
        stats: state.stats,
        lastError: state.lastError
      });
      return;
    }

    if (req.method !== 'POST' || url.pathname !== '/quote') {
      sendJson(res, 404, { ok: false, error: 'not found' });
      return;
    }

    try {
      const body = await readRequestBody(req);
      const response = await handleQuoteRequest({ body, state, runQuote });
      sendJson(res, response.statusCode, response.payload);
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const options = normalizeDaemonOptions({
    host: args.host,
    port: args.port,
    timeoutMs: args['timeout-ms'],
    headless: args.headless === 'true',
    verbose: args.verbose === 'true'
  });

  const browser = await launchChrome({
    headless: options.headless,
    verbose: options.verbose
  });
  const state = createDaemonState({
    chromePort: browser.port
  });
  const server = createDaemonServer({
    state,
    runQuote: (httpRequest) => runOnce(browser.cdp, httpRequest, options.timeoutMs)
  });

  server.listen(options.port, options.host, () => {
    console.log('--- Llama-ParaSwap Browser Proxy Daemon ---');
    console.log('listen:', `http://${options.host}:${options.port}`);
    console.log('chromePort:', browser.port);
    console.log('headless:', options.headless);
    console.log('timeoutMs:', options.timeoutMs);
  });

  async function shutdown() {
    server.close();
    await browser.close();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  createDaemonServer,
  createDaemonState,
  handleQuoteRequest,
  normalizeDaemonOptions,
  normalizeQuoteBody
};
