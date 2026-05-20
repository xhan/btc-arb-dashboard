const assert = require('assert');

const {
  createDashboardQuoteDomainAdapter
} = require('../src/app/dashboard-quote-domain-adapter');

const calls = [];
const adapter = createDashboardQuoteDomainAdapter({
  chainDefaults: {
    isCrossChainQuote(quote) {
      calls.push(['isCrossChainQuote', quote]);
      return quote.crossChain === true;
    },
    buildQuoteChainDisplayName(quote) {
      calls.push(['buildQuoteChainDisplayName', quote]);
      return `chain:${quote.chain}`;
    },
    isCexOrderbookChain(chain) {
      calls.push(['isCexOrderbookChain', chain]);
      return String(chain).toLowerCase() === 'bybit';
    },
    getDefaultSourceForChain(chain) {
      calls.push(['getDefaultSourceForChain', chain]);
      return `source:${chain}`;
    },
    isEvmChain(chain) {
      calls.push(['isEvmChain', chain]);
      return chain === 'ethereum';
    }
  },
  queueStatsUtils: {
    shouldQueueInverseFetch(quote) {
      calls.push(['shouldQueueInverseFetch', quote]);
      return quote.inverse === true;
    }
  },
  quotePauseUtils: {
    isQuotePaused(quote) {
      calls.push(['isQuotePaused', quote]);
      return quote.paused === true;
    },
    getActiveQuotes(quotes) {
      calls.push(['getActiveQuotes', quotes]);
      return quotes.filter((quote) => quote.paused !== true);
    },
    getCategoryPauseAction(quotes) {
      calls.push(['getCategoryPauseAction', quotes]);
      return quotes.length > 0 ? 'pause' : 'none';
    }
  },
  quoteRequestUtils: {
    normalizeChainKey(chain) {
      calls.push(['normalizeChainKey', chain]);
      return String(chain).trim().toLowerCase();
    }
  }
});

const quote = { chain: 'Ethereum', crossChain: true, inverse: true, paused: true };
assert.strictEqual(adapter.isCrossChainQuote(quote), true);
assert.strictEqual(adapter.getQuoteChainDisplayName(quote), 'chain:Ethereum');
assert.strictEqual(adapter.isCexOrderbookChain('Bybit'), true);
assert.strictEqual(adapter.getDefaultSourceForChain('arbitrum'), 'source:arbitrum');
assert.strictEqual(adapter.isEvmChain('ethereum'), true);
assert.strictEqual(adapter.shouldQueueInverseFetch(quote), true);
assert.strictEqual(adapter.isQuotePaused(quote), true);
assert.deepStrictEqual(adapter.getActiveQuotes([{ id: 1 }, { id: 2, paused: true }]), [{ id: 1 }]);
assert.strictEqual(adapter.getCategoryPauseAction([{ id: 1 }]), 'pause');
assert.strictEqual(adapter.normalizeChainKey(' Ethereum '), 'ethereum');

assert.deepStrictEqual(calls.map((call) => call[0]), [
  'isCrossChainQuote',
  'buildQuoteChainDisplayName',
  'isCexOrderbookChain',
  'getDefaultSourceForChain',
  'isEvmChain',
  'shouldQueueInverseFetch',
  'isQuotePaused',
  'getActiveQuotes',
  'getCategoryPauseAction',
  'normalizeChainKey'
]);
