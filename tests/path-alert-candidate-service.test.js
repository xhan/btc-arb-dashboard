const assert = require('assert');

const {
  buildPathAlertCandidateLabel,
  buildPathAlertQuoteCandidatesFromConfig,
  resolveQuoteTokenSymbols
} = require('../src/server/path-alert-candidate-service');

function createMarketClients() {
  return {
    getSolanaTokenMeta: async (token) => ({ symbol: token === 'So111' ? 'SOL' : 'USDC' }),
    getSuiTokenMeta: async (token) => ({ symbol: token.includes('sui') ? 'SUI' : 'USDC' }),
    getStarknetTokenMeta: async (token) => ({ symbol: token === '0xstrk' ? 'STRK' : 'USDC' }),
    getEvmTokenMeta: async (chain, token) => ({ symbol: token === '0xaaa' ? 'GHO' : 'USDC' })
  };
}

assert.strictEqual(buildPathAlertCandidateLabel('ethereum', 'GHO', 'USDC'), '(eth) GHO -> USDC');
assert.strictEqual(buildPathAlertCandidateLabel('arbitrum', 'WBTC', 'USDC'), '(arb) WBTC -> USDC');
assert.strictEqual(buildPathAlertCandidateLabel('unknown', 'A', 'B', ' [x]'), '(unknown) A -> B [x]');
assert.strictEqual(buildPathAlertCandidateLabel('sui', '', '', ''), '(sui) -- -> --');

async function runResolveSymbolsTest() {
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols({ chain: 'Bybit', symbol: 'WBTCBTC' }, createMarketClients()),
    { fromSymbol: 'WBTC', toSymbol: 'BTC' }
  );
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols({ chain: 'Bybit' }, createMarketClients()),
    { fromSymbol: '', toSymbol: 'QUOTE' }
  );
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols({ chain: 'solana', fromToken: 'So111', toToken: 'USDC111' }, createMarketClients()),
    { fromSymbol: 'SOL', toSymbol: 'USDC' }
  );
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols({ chain: 'sol', fromToken: 'So111', toToken: 'USDC111' }, createMarketClients()),
    { fromSymbol: 'SOL', toSymbol: 'USDC' }
  );
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols({ chain: 'sui', fromToken: '0x2::sui::SUI', toToken: '0x2::usdc::USDC' }, createMarketClients()),
    { fromSymbol: 'SUI', toSymbol: 'USDC' }
  );
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols({ chain: 'starknet', fromToken: '0xstrk', toToken: '0xusdc' }, createMarketClients()),
    { fromSymbol: 'STRK', toSymbol: 'USDC' }
  );
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols({ chain: 'strk', fromToken: '0xstrk', toToken: '0xusdc' }, createMarketClients()),
    { fromSymbol: 'STRK', toSymbol: 'USDC' }
  );
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols({ chain: 'ethereum', fromToken: '0xaaa', toToken: '0xbbb' }, createMarketClients()),
    { fromSymbol: 'GHO', toSymbol: 'USDC' }
  );
  const evmChains = [];
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols(
      { chain: 'arb', fromToken: '0xaaa', toToken: '0xbbb' },
      {
        ...createMarketClients(),
        getEvmTokenMeta: async (chain, token) => {
          evmChains.push(chain);
          return { symbol: chain === 'arbitrum' && token === '0xaaa' ? 'GHO' : 'USDC' };
        }
      }
    ),
    { fromSymbol: 'GHO', toSymbol: 'USDC' }
  );
  assert.deepStrictEqual(evmChains, ['arbitrum', 'arbitrum']);
}

async function runFallbackTest() {
  assert.deepStrictEqual(
    await resolveQuoteTokenSymbols(
      { chain: 'ethereum', fromToken: '0x1234567890abcdef123456', toToken: '0xabcdef1234567890abcdef' },
      {
        getEvmTokenMeta: async () => {
          throw new Error('meta failed');
        }
      }
    ),
    { fromSymbol: '0x1234...123456', toSymbol: '0xabcd...abcdef' }
  );
}

async function runCandidatesFromConfigTest() {
  const candidates = await buildPathAlertQuoteCandidatesFromConfig({
    configPath: '/config.json',
    readJsonFile: async () => ({
      dashboard: [
        {
          name: '测试监控',
          quotes: [
            {
              id: 101,
              chain: 'arbitrum',
              fromToken: '0xaaa',
              toToken: '0xbbb',
              showInverse: true
            },
            {
              id: 102,
              chain: 'Bybit',
              symbol: 'WBTCBTC'
            },
            {
              id: 103,
              chain: 'sui',
              fromToken: '0x2::sui::SUI',
              toToken: '0x2::usdc::USDC',
              paused: true,
              showInverse: true
            }
          ]
        }
      ]
    }),
    marketClients: createMarketClients()
  });

  assert.deepStrictEqual(
    candidates.map((item) => item.key),
    ['101:forward', '101:inverse', '102:cex-bid1', '102:cex-ask1-inverse']
  );
  const ethForward = candidates.find((item) => item.key === '101:forward');
  assert.strictEqual(ethForward.fromSymbol, 'GHO');
  assert.strictEqual(ethForward.toSymbol, 'USDC');
  assert.ok(ethForward.label.includes('(arb) GHO -> USDC'));
  assert.ok(ethForward.searchText.includes('测试监控 arbitrum arb  0xaaa 0xbbb GHO USDC'));
}

async function runMissingConfigTest() {
  const candidates = await buildPathAlertQuoteCandidatesFromConfig({
    configPath: '/missing.json',
    readJsonFile: async () => {
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    },
    marketClients: createMarketClients()
  });
  assert.deepStrictEqual(candidates, []);
}

Promise.resolve()
  .then(runResolveSymbolsTest)
  .then(runFallbackTest)
  .then(runCandidatesFromConfigTest)
  .then(runMissingConfigTest)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
