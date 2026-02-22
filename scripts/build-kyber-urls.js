#!/usr/bin/env node

/*
 * 生成当前 Kyber 压测 URL 列表（包含 reverse）
 *
 * 默认输入:
 * - config.json
 * - metadata-cache.json
 *
 * 默认输出:
 * - scripts/urls.json
 *
 * 示例:
 * node scripts/build-kyber-urls.js
 */

const fs = require('fs');
const path = require('path');
const {
  buildKyberRouteUrl,
  getDecimalsFromMetadataCache,
  isKyberQuote,
  normalizeUrlList
} = require('./kyber-url-list');

const RPC_URLS = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  optimism: 'https://optimism-rpc.publicnode.com',
  bsc: 'https://bsc-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
  base: 'https://base-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  linea: 'https://linea-rpc.publicnode.com',
  scroll: 'https://rpc.scroll.io',
  mantle: 'https://mantle-rpc.publicnode.com',
  blast: 'https://rpc.blast.io',
  mode: 'https://mainnet.mode.network',
  sonic: 'https://rpc.soniclabs.com',
  berachain: 'https://berachain-rpc.publicnode.com',
  ronin: 'https://ronin.drpc.org',
  unichain: 'https://sepolia.unichain.org',
  hyperevm: 'https://rpc.hypurrscan.io',
  plasma: 'https://rpc.plasma.to',
  etherlink: 'https://node.mainnet.etherlink.com',
  monad: 'https://monad-mainnet.drpc.org',
  zksync: 'https://mainnet.era.zksync.io',
  moonbeam: 'https://rpc.api.moonbeam.network',
  boba: 'https://mainnet.boba.network',
  gnosis: 'https://rpc.gnosischain.com',
  'polygon-zkevm': 'https://zkevm-rpc.com',
  celo: 'https://forno.celo.org',
  fantom: 'https://rpc.ftm.tools',
  cronos: 'https://evm.cronos.org'
};
const RPC_DECIMALS_TIMEOUT_MS = 5000;
const DECIMALS_CALL_DATA = '0x313ce567';

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

async function postJsonRpc(rpcUrl, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_DECIMALS_TIMEOUT_MS);

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`http ${response.status} ${response.statusText}`);
    }
    return JSON.parse(text);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`rpc timeout after ${RPC_DECIMALS_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function getDecimals(chain, tokenAddress, metadataCache, rpcDecimalsCache) {
  const cached = getDecimalsFromMetadataCache(metadataCache, chain, tokenAddress);
  if (Number.isFinite(cached)) return cached;

  const key = `${chain}:${String(tokenAddress).toLowerCase()}`;
  if (rpcDecimalsCache.has(key)) return rpcDecimalsCache.get(key);

  const rpc = RPC_URLS[chain];
  if (!rpc) throw new Error(`missing rpc for chain=${chain}`);

  const data = await postJsonRpc(rpc, {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_call',
    params: [
      { to: tokenAddress, data: DECIMALS_CALL_DATA },
      'latest'
    ]
  });

  if (data.error) {
    throw new Error(data.error.message || 'rpc error');
  }
  if (!data.result || typeof data.result !== 'string') {
    throw new Error('missing rpc result');
  }

  const decimals = Number(BigInt(data.result));
  if (!Number.isFinite(decimals)) {
    throw new Error(`invalid decimals for ${chain}:${tokenAddress}`);
  }

  rpcDecimalsCache.set(key, decimals);
  return decimals;
}

async function buildUrlsFromConfig(quotes, metadataCache) {
  const rpcDecimalsCache = new Map();
  const rawUrls = [];
  let skippedQuotes = 0;

  for (const quote of Array.isArray(quotes) ? quotes : []) {
    if (!isKyberQuote(quote)) continue;

    const chain = String(quote.chain || '').toLowerCase();
    const amount = quote.amount || 1;

    try {
      const fromDecimals = await getDecimals(chain, quote.fromToken, metadataCache, rpcDecimalsCache);
      rawUrls.push(buildKyberRouteUrl(chain, quote.fromToken, quote.toToken, amount, fromDecimals));

      if (quote.showInverse) {
        const inverseDecimals = await getDecimals(chain, quote.toToken, metadataCache, rpcDecimalsCache);
        rawUrls.push(buildKyberRouteUrl(chain, quote.toToken, quote.fromToken, amount, inverseDecimals));
      }
    } catch (error) {
      skippedQuotes += 1;
      console.warn('skip quote:', quote.chain, quote.fromToken, '->', quote.toToken, '|', error.message);
    }
  }

  return {
    urls: normalizeUrlList(rawUrls),
    skippedQuotes,
    rpcDecimalsResolved: rpcDecimalsCache.size
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const configPath = path.resolve(args.config || 'config.json');
  const metadataPath = path.resolve(args.metadata || 'metadata-cache.json');
  const outputPath = path.resolve(args.output || 'scripts/urls.json');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const metadataCache = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const quotes = (config.dashboard || []).flatMap((c) => (Array.isArray(c.quotes) ? c.quotes : []));

  const result = await buildUrlsFromConfig(quotes, metadataCache);
  const urls = result.urls;
  fs.writeFileSync(outputPath, `${JSON.stringify(urls, null, 2)}\n`, 'utf8');

  console.log('Kyber URLs generated');
  console.log('config:', configPath);
  console.log('metadata:', metadataPath);
  console.log('output:', outputPath);
  console.log('count:', urls.length);
  console.log('rpcDecimalsResolved:', result.rpcDecimalsResolved);
  console.log('skippedQuotes:', result.skippedQuotes);
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
