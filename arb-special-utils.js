(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./arb-paths'));
    return;
  }
  root.ArbSpecialUtils = factory(root.ArbPaths);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (arbPathsApi) {
  const DEFAULT_BYBIT_PAIR_RULE_CONFIG = Object.freeze({
    withdrawFee: 0.0001,
    maxBookLevels: 10,
    displayTargets: [],
    depthDisplayLevels: 3
  });

  function isCexChain(chain) {
    const normalized = String(chain || '').trim().toLowerCase();
    return normalized === 'bybit' || normalized === 'binance';
  }

  function isEthereumChain(chain) {
    return String(chain || '').trim().toLowerCase() === 'ethereum';
  }

  function resolveAlias(symbol, aliasRules) {
    if (!aliasRules) return symbol;
    for (const [alias, target] of Object.entries(aliasRules)) {
      if (alias === symbol) return target;
    }
    return symbol;
  }

  function symbolsMatch(left, right, aliasRules) {
    return resolveAlias(left, aliasRules) === resolveAlias(right, aliasRules);
  }

  function toPositiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function toNonNegativeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function formatNumber(value, decimals = 6) {
    if (!Number.isFinite(value)) return '--';
    return Number(value.toFixed(decimals)).toString();
  }

  function formatSignedNumber(value, decimals = 6) {
    if (!Number.isFinite(value)) return '--';
    const absText = formatNumber(Math.abs(value), decimals);
    return value < 0 ? `-${absText}` : absText;
  }

  function formatFixedNumber(value, decimals = 6) {
    if (!Number.isFinite(value)) return '--';
    return Number(value).toFixed(decimals);
  }

  function normalizeDisplayTargets(targets) {
    if (!Array.isArray(targets)) return [];
    return targets
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
  }

  function normalizeDecimalConfig(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.floor(parsed);
  }

  function formatConfiguredNumber(value, configuredDecimals, fallbackDecimals) {
    if (!Number.isFinite(value)) return '--';
    if (Number.isInteger(configuredDecimals) && configuredDecimals >= 0) {
      return Number(value).toFixed(configuredDecimals);
    }
    return formatNumber(value, fallbackDecimals);
  }

  function formatConfiguredSignedNumber(value, configuredDecimals, fallbackDecimals) {
    if (!Number.isFinite(value)) return '--';
    const absText = formatConfiguredNumber(Math.abs(value), configuredDecimals, fallbackDecimals);
    return value < 0 ? `-${absText}` : absText;
  }

  function buildEdges(quotes, quoteStateById) {
    const edges = [];
    for (const quote of quotes || []) {
      const state = quoteStateById instanceof Map ? quoteStateById.get(quote.id) : null;
      if (!state) continue;

      if (state.fromSymbol && state.toSymbol && typeof state.lastRawPrice === 'number') {
        edges.push({
          from: state.fromSymbol,
          to: state.toSymbol,
          rate: state.lastRawPrice,
          chain: quote.chain,
          quoteId: quote.id
        });
      }

      if (quote.showInverse && state.fromSymbol && state.toSymbol && typeof state.inverseRawPrice === 'number') {
        edges.push({
          from: state.toSymbol,
          to: state.fromSymbol,
          rate: state.inverseRawPrice,
          chain: quote.chain,
          quoteId: quote.id,
          inverse: true
        });
      }
    }
    return edges;
  }

  function selectBestMatchingEdge(edges, from, to, aliasRules, options = {}) {
    const chainPredicate = typeof options.chainPredicate === 'function'
      ? options.chainPredicate
      : () => true;
    let best = null;

    for (const edge of edges || []) {
      if (!chainPredicate(edge.chain)) continue;
      if (!symbolsMatch(edge.from, from, aliasRules)) continue;
      if (!symbolsMatch(edge.to, to, aliasRules)) continue;
      if (!best || edge.rate > best.rate) {
        best = { ...edge };
      }
    }

    return best;
  }

  function normalizeOrderbookLevels(levels, maxLevels) {
    const limit = Math.max(1, Math.floor(toPositiveNumber(maxLevels, 10)));
    if (!Array.isArray(levels)) return [];

    return levels
      .map((level) => {
        const price = Number(level && level.price);
        const size = Number(level && level.size);
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size <= 0) return null;
        return { price, size };
      })
      .filter(Boolean)
      .slice(0, limit);
  }

  function buildBestBybitBook(quotes, quoteStateById, rule, aliasRules, maxBookLevels) {
    const normalizedRuleCexChain = String(rule.cexChain || 'Bybit').trim().toLowerCase();
    let bidCandidate = null;
    let askCandidate = null;

    for (const quote of quotes || []) {
      if (!quote || String(quote.chain || '').trim().toLowerCase() !== normalizedRuleCexChain) continue;
      const state = quoteStateById instanceof Map ? quoteStateById.get(quote.id) : null;
      const book = state && state.cexOrderbook;
      if (!state || !book) continue;

      if (!symbolsMatch(state.fromSymbol, rule.dexQuote, aliasRules)) continue;
      if (!symbolsMatch(state.toSymbol, rule.cexQuote, aliasRules)) continue;

      const bids = normalizeOrderbookLevels(
        Array.isArray(book.bidsTopDepth) && book.bidsTopDepth.length
          ? book.bidsTopDepth
          : book.bidsTop5,
        maxBookLevels
      );
      const asks = normalizeOrderbookLevels(
        Array.isArray(book.asksTopDepth) && book.asksTopDepth.length
          ? book.asksTopDepth
          : book.asksTop5,
        maxBookLevels
      );

      if (bids.length && (!bidCandidate || bids[0].price > bidCandidate.levels[0].price)) {
        bidCandidate = {
          quoteId: quote.id,
          chain: quote.chain,
          levels: bids
        };
      }
      if (asks.length && (!askCandidate || asks[0].price < askCandidate.levels[0].price)) {
        askCandidate = {
          quoteId: quote.id,
          chain: quote.chain,
          levels: asks
        };
      }
    }

    return {
      bidCandidate,
      askCandidate
    };
  }

  class BaseSpecialRuleRunner {
    constructor(rule) {
      this.rule = rule || {};
    }

    run() {
      return null;
    }
  }

  class BybitPairSpecialRuleRunner extends BaseSpecialRuleRunner {
    constructor(rule) {
      super(rule);
      this.withdrawFee = toNonNegativeNumber(rule.withdrawFee, DEFAULT_BYBIT_PAIR_RULE_CONFIG.withdrawFee);
      this.maxBookLevels = toPositiveNumber(rule.maxBookLevels, DEFAULT_BYBIT_PAIR_RULE_CONFIG.maxBookLevels);
      this.displayTargets = normalizeDisplayTargets(rule.displayTargets);
      this.depthDisplayLevels = Math.max(1, Math.floor(toPositiveNumber(rule.depthDisplayLevels, DEFAULT_BYBIT_PAIR_RULE_CONFIG.depthDisplayLevels)));
      this.depthSizeDecimals = normalizeDecimalConfig(rule.depthSizeDecimals);
      this.targetAmountDecimals = normalizeDecimalConfig(rule.targetAmountDecimals);
      this.profitDecimals = normalizeDecimalConfig(rule.profitDecimals);
    }

    buildDirectionResult(options = {}) {
      const direction = String(options.direction || '');
      const dexLeg = options.dexLeg || null;
      const cexBook = options.cexBook || null;
      const levels = Array.isArray(cexBook && cexBook.levels) ? cexBook.levels : [];
      const dexRate = Number(dexLeg && dexLeg.rate);
      if (!dexLeg || !Number.isFinite(dexRate) || !levels.length) {
        return null;
      }

      let totalInput = 0;
      let totalGrossProfit = 0;
      let weightedCexRateNotional = 0;
      const usedLevels = [];

      for (const level of levels) {
        const price = Number(level && level.price);
        const size = Number(level && level.size);
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size <= 0) continue;

        let unitProfitRate = null;
        let cexRate = null;
        if (direction === 'eth-to-bybit-bid') {
          cexRate = price;
          unitProfitRate = (dexRate * cexRate) - 1;
        } else {
          cexRate = 1 / price;
          unitProfitRate = (cexRate * dexRate) - 1;
        }
        if (!Number.isFinite(unitProfitRate) || unitProfitRate <= 0) break;

        totalInput += size;
        totalGrossProfit += size * unitProfitRate;
        weightedCexRateNotional += cexRate * size;

        const cumulativeProfitRate = totalInput > 0 ? totalGrossProfit / totalInput : null;
        usedLevels.push({
          price,
          size,
          unitProfitRate,
          cumulativeInput: totalInput,
          cumulativeProfitRate,
          cumulativeProfit: totalGrossProfit
        });
      }

      if (!usedLevels.length || totalInput <= 0) {
        return null;
      }

      const grossProfitRate = totalGrossProfit / totalInput;
      const netProfit = totalGrossProfit - this.withdrawFee;
      const netProfitRate = netProfit / totalInput;
      const netProfitBp = netProfitRate * 10000;
      const weightedCexRate = weightedCexRateNotional / totalInput;
      const directionLabel = direction === 'eth-to-bybit-bid'
        ? `ETH ${dexLeg.from}->${dexLeg.to} + Bybit BID`
        : `Bybit ASK -> ETH ${dexLeg.from}->${dexLeg.to}`;

      return {
        direction,
        directionLabel,
        dexLeg: { ...dexLeg },
        cexQuoteId: Number(cexBook.quoteId),
        cexChain: cexBook.chain,
        usedLevels,
        totalInput,
        grossProfit: totalGrossProfit,
        grossProfitRate,
        netProfit,
        netProfitRate,
        netProfitBp,
        weightedCexRate
      };
    }

    buildDisplayTargetResults(primary, rule) {
      const targets = this.displayTargets;
      if (!targets.length) return [];

      return targets.map((targetAmount) => {
        if (targetAmount > primary.totalInput) return null;
        let remaining = targetAmount;
        let grossProfit = 0;
        for (const level of primary.usedLevels) {
          if (remaining <= 0) break;
          const fillAmount = Math.min(remaining, Number(level.size) || 0);
          if (fillAmount <= 0) continue;
          grossProfit += fillAmount * Number(level.unitProfitRate || 0);
          remaining -= fillAmount;
        }
        if (remaining > 0) return null;
        const grossProfitBp = (grossProfit / targetAmount) * 10000;
        return {
          targetAmount,
          profit: grossProfit,
          profitBp: grossProfitBp
        };
      }).filter(Boolean);
    }

    buildDepthSummary(primary) {
      return primary.usedLevels.slice(0, this.depthDisplayLevels).map((level, index) => ({
        index: index + 1,
        price: level.price,
        size: level.size,
        unitProfitBp: Number(level.unitProfitRate) * 10000
      }));
    }

    buildInputSymbol(primary, rule) {
      return primary.direction === 'eth-to-bybit-bid' ? rule.dexQuote : rule.cexQuote;
    }

    buildDexLine(primary, rule) {
      if (primary.direction === 'eth-to-bybit-bid') {
        return `（ETH）${rule.dexBase} -> ${rule.dexQuote} ${formatNumber(primary.dexLeg.rate, 6)}`;
      }
      return `（ETH）${rule.dexQuote} -> ${rule.dexBase} ${formatNumber(primary.dexLeg.rate, 6)}`;
    }

    buildCexLine(primary, rule) {
      const topPrice = formatNumber(primary.usedLevels[0] && primary.usedLevels[0].price, 6);
      if (primary.direction === 'eth-to-bybit-bid') {
        return `（Bybit）${rule.dexQuote} -> ${rule.cexQuote} ${topPrice} bid1`;
      }
      return `（Bybit）${rule.cexQuote} -> ${rule.dexQuote} ${topPrice} ask1`;
    }

    buildDepthLine(item) {
      const sizeText = formatConfiguredNumber(item.size, this.depthSizeDecimals, 6);
      const priceText = formatNumber(item.price, 6);
      const bpText = `${item.unitProfitBp >= 0 ? '+' : ''}${formatNumber(item.unitProfitBp, 2)} bp`;
      return `${item.index}) ${sizeText}     ${priceText}     ${bpText}`;
    }

    buildTargetLine(amount, profit, bp, isMax = false) {
      const amountText = formatConfiguredNumber(amount, this.targetAmountDecimals, 6);
      const profitText = formatConfiguredSignedNumber(profit, this.profitDecimals, 8);
      const bpText = `${formatSignedNumber(bp, 2)} bp`;
      return `${amountText}     ${profitText}     ${bpText}${isMax ? '   MAX' : ''}`;
    }

    buildMessage(primary, secondary, rule, options = {}) {
      const lines = [];
      const includeSecondary = options.includeSecondary === true;
      const depthLines = this.buildDepthSummary(primary).map((item) => this.buildDepthLine(item));
      const targetLines = this.buildDisplayTargetResults(primary, rule).map((item) => (
        this.buildTargetLine(item.targetAmount, item.profit, item.profitBp)
      ));
      lines.push(this.buildDexLine(primary, rule));
      lines.push(this.buildCexLine(primary, rule));
      lines.push('');
      lines.push(...depthLines);
      if (targetLines.length) {
        lines.push('');
        lines.push(...targetLines);
      }
      lines.push('');
      lines.push(this.buildTargetLine(primary.totalInput, primary.netProfit, primary.netProfitBp, true));

      if (includeSecondary && secondary && Number.isFinite(secondary.netProfit)) {
        lines.push('');
        lines.push(
          `另一方向: ${secondary.directionLabel} | ${formatSignedNumber(secondary.netProfit, 8)} ${rule.cexQuote} , ${formatSignedNumber(secondary.netProfitBp, 2)} bp`
        );
      }

      return lines.join('\n');
    }

    buildDisplayMessage(primary, secondary, rule) {
      return this.buildMessage(primary, secondary, rule, { includeSecondary: false });
    }

    buildAlertMessage(primary, secondary, rule) {
      return this.buildMessage(primary, secondary, rule, { includeSecondary: true });
    }

    buildCycle(primary, rule) {
      if (primary.direction === 'eth-to-bybit-bid') {
        return {
          legs: [
            {
              from: primary.dexLeg.from,
              to: primary.dexLeg.to,
              rate: primary.dexLeg.rate,
              chain: primary.dexLeg.chain,
              quoteId: primary.dexLeg.quoteId
            },
            {
              from: rule.dexQuote,
              to: rule.cexQuote,
              rate: primary.weightedCexRate,
              chain: primary.cexChain,
              quoteId: primary.cexQuoteId,
              cexLevelLabel: 'bid',
              cexLevelSize: primary.totalInput
            }
          ],
          profitRate: primary.netProfitRate
        };
      }

      return {
        legs: [
          {
            from: rule.cexQuote,
            to: rule.dexQuote,
            rate: primary.weightedCexRate,
            chain: primary.cexChain,
            quoteId: primary.cexQuoteId,
            inverse: true,
            cexLevelLabel: 'ask',
            cexLevelSize: primary.totalInput
          },
          {
            from: primary.dexLeg.from,
            to: primary.dexLeg.to,
            rate: primary.dexLeg.rate,
            chain: primary.dexLeg.chain,
            quoteId: primary.dexLeg.quoteId
          }
        ],
        profitRate: primary.netProfitRate
      };
    }

    run(context = {}) {
      if (!arbPathsApi || !context || !Array.isArray(context.quotes) || !(context.quoteStateById instanceof Map)) {
        return null;
      }

      const rule = {
        id: String(this.rule.id || 'special:wbtc-bybit'),
        title: String(this.rule.title || 'WBTC <-> BYBIT'),
        dexBase: String(this.rule.dexBase || 'cbBTC'),
        dexQuote: String(this.rule.dexQuote || 'WBTC'),
        cexQuote: String(this.rule.cexQuote || 'BTC'),
        cexChain: String(this.rule.cexChain || 'Bybit')
      };
      const aliasRules = context.aliasRules || null;
      const edges = buildEdges(context.quotes, context.quoteStateById);
      const dexEdges = edges.filter((edge) => !isCexChain(edge.chain));
      const dexForward = selectBestMatchingEdge(
        dexEdges,
        rule.dexBase,
        rule.dexQuote,
        aliasRules,
        { chainPredicate: isEthereumChain }
      );
      const dexReverse = selectBestMatchingEdge(
        dexEdges,
        rule.dexQuote,
        rule.dexBase,
        aliasRules,
        { chainPredicate: isEthereumChain }
      );
      const bybitBook = buildBestBybitBook(context.quotes, context.quoteStateById, rule, aliasRules, this.maxBookLevels);

      const candidates = [];
      if (dexForward && bybitBook.bidCandidate) {
        const result = this.buildDirectionResult({
          direction: 'eth-to-bybit-bid',
          dexLeg: dexForward,
          cexBook: bybitBook.bidCandidate
        });
        if (result) candidates.push(result);
      }
      if (dexReverse && bybitBook.askCandidate) {
        const result = this.buildDirectionResult({
          direction: 'bybit-ask-to-eth',
          dexLeg: dexReverse,
          cexBook: bybitBook.askCandidate
        });
        if (result) candidates.push(result);
      }
      if (!candidates.length) {
        return null;
      }

      const sorted = [...candidates].sort((left, right) => {
        const profitDiff = right.netProfit - left.netProfit;
        if (profitDiff !== 0) return profitDiff;
        return right.netProfitRate - left.netProfitRate;
      });
      const primary = sorted[0];
      const secondary = sorted[1] || null;
      const cycle = this.buildCycle(primary, rule);
      const displayMessage = this.buildDisplayMessage(primary, secondary, rule);
      const alertMessage = this.buildAlertMessage(primary, secondary, rule);

      return {
        ruleId: rule.id,
        direction: primary.direction,
        label: rule.title,
        cycle,
        display_message: displayMessage,
        alert_message: alertMessage,
        stats: {
          primary,
          secondary
        }
      };
    }
  }

  function createSpecialRuleRunner(rule) {
    if (!rule || typeof rule !== 'object') return null;
    const type = String(rule.type || '').trim();
    if (type === 'pair-bybit' || type === 'wbtc-bybit' || type === 'dex-cex') {
      return new BybitPairSpecialRuleRunner(rule);
    }
    return null;
  }

  function buildSpecialArbOpportunities(options = {}) {
    const rules = Array.isArray(options.rules) ? options.rules : [];
    const opportunities = [];

    for (const rule of rules) {
      const runner = createSpecialRuleRunner(rule);
      if (!runner) continue;
      let opportunity = null;
      try {
        opportunity = runner.run({
          quotes: Array.isArray(options.quotes) ? options.quotes : [],
          quoteStateById: options.quoteStateById instanceof Map ? options.quoteStateById : new Map(),
          aliasRules: options.aliasRules || null
        });
      } catch (error) {
        // 单条特殊规则失败不应影响其他规则渲染
        opportunity = null;
      }
      if (!opportunity || !opportunity.cycle || !Number.isFinite(opportunity.cycle.profitRate)) continue;
      opportunities.push(opportunity);
    }

    return opportunities.sort((a, b) => b.cycle.profitRate - a.cycle.profitRate);
  }

  return {
    buildSpecialArbOpportunities,
    isCexChain
  };
}));
