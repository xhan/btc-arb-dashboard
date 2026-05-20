(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardRenderer = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  const DEFAULT_CHAIN_ADDRESS_PLACEHOLDERS = Object.freeze({
    ethereum: '0x...',
    solana: 'Enter mint address...',
    sui: '0x...::module::TYPE',
    polygon: '0x...',
    arbitrum: '0x...',
    optimism: '0x...',
    bsc: '0x...',
    avalanche: '0x...',
    base: '0x...',
    megaeth: '0x...',
    hemi: '0x...',
    katana: '0x...',
    starknet: '0x...',
    Bybit: 'N/A',
    bybit: 'N/A',
    Binance: 'N/A',
    binance: 'N/A'
  });
  const SETTINGS_INTERVAL_FIELDS = Object.freeze([
    Object.freeze({ key: 'kyber', id: 'setting-kyber-interval' }),
    Object.freeze({ key: 'zerox', id: 'setting-zerox-interval' }),
    Object.freeze({ key: 'velora', id: 'setting-velora-interval' }),
    Object.freeze({ key: 'llamaparaswap', id: 'setting-llama-paraswap-interval' }),
    Object.freeze({ key: 'lifi', id: 'setting-lifi-interval' }),
    Object.freeze({ key: 'bybit', id: 'setting-bybit-interval' }),
    Object.freeze({ key: 'binance', id: 'setting-binance-interval' }),
    Object.freeze({ key: 'solana', id: 'setting-solana-interval' }),
    Object.freeze({ key: 'sui', id: 'setting-sui-interval' }),
    Object.freeze({ key: 'starknet', id: 'setting-starknet-interval' })
  ]);

  function parseKyberExcludedSourcesInput(value) {
    const rawItems = Array.isArray(value)
      ? value
      : String(value || '').split(/[\s,]+/);
    const seen = new Set();
    const sources = [];

    rawItems.forEach((item) => {
      const source = String(item || '').trim();
      if (!source || seen.has(source)) return;
      seen.add(source);
      sources.push(source);
    });

    return sources;
  }

  function formatKyberExcludedSourcesInput(value) {
    return parseKyberExcludedSourcesInput(value).join(' ');
  }

  function areStringArraysEqual(left, right) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => item === right[index]);
  }

  function renderQuoteItemShell(config = {}) {
    const quoteId = escapeAttr(config.quoteId);
    const categoryId = escapeAttr(config.categoryId);
    const isPaused = config.paused === true;
    const pauseTitle = isPaused ? '恢复' : '暂停';
    const pauseIcon = isPaused ? '▶️' : '⏸️';
    const quoteTextClassName = config.quoteTextClassName || 'quote-text';

    return `
            <div class="quote-left-container">
                <span class="quote-label-stack">
                    <span class="quote-label-row">
                        <span class="quote-label">${escapeHtml(config.displayName)}</span>
                        ${config.requestChannelTagHtml || ''}
                    </span>
                    ${config.pairLabelHtml || ''}
                </span>
                <span id="trend-arrow-${quoteId}" class="trend-arrow"></span>
            </div>
            <div class="quote-result">
                <div id="quote-data-${quoteId}" class="quote-data">
                    <div style="display:flex; align-items:center;">
                        ${config.amountInputHtml || ''}
                        <span class="quote-text-wrapper" id="quote-text-wrapper-${quoteId}">
                            <span class="${escapeAttr(quoteTextClassName)}" id="quote-text-${quoteId}">${escapeHtml(config.lastResultText)}</span>
                        </span>
                    </div>
                </div>
                <div class="quote-actions">
                    <button class="icon-btn" title="${pauseTitle}" aria-label="${pauseTitle}" aria-pressed="${isPaused ? 'true' : 'false'}" data-toggle-pause-id="${quoteId}" data-category-id="${categoryId}">${pauseIcon}</button>
                    <button class="icon-btn" title="设置" data-edit-alert-id="${quoteId}" data-category-id="${categoryId}">⚙️</button>
                </div>
            </div>`;
  }

  function createQuoteItemShellElement(config = {}, options = {}) {
    const documentImpl = options.documentImpl || (typeof document !== 'undefined' ? document : null);
    if (!documentImpl || typeof documentImpl.createElement !== 'function') return null;
    const itemEl = documentImpl.createElement('li');
    itemEl.id = `quote-item-${config.quoteId}`;
    itemEl.className = config.paused === true ? 'quote-item quote-item-paused' : 'quote-item';
    itemEl.innerHTML = renderQuoteItemShell(config);
    return itemEl;
  }

  function renderCategoryModuleShell(config = {}) {
    const categoryId = escapeAttr(config.categoryId);
    const categoryPauseAction = config.categoryPauseAction === 'resume' ? 'resume' : 'pause';
    const categoryPauseTitle = categoryPauseAction === 'resume' ? '恢复分区' : '暂停分区';
    const categoryPauseIcon = categoryPauseAction === 'resume' ? '▶️' : '⏸️';

    return `
            <div class="module-header">
                <h2>${escapeHtml(config.categoryName)}</h2>
                <div class="module-header-actions">
                    <button class="icon-btn add-quote-btn" title="添加报价" aria-label="添加报价" data-category-id="${categoryId}">+</button>
                    <button class="icon-btn" title="${categoryPauseTitle}" aria-label="${categoryPauseTitle}" aria-pressed="${categoryPauseAction === 'resume' ? 'true' : 'false'}" data-toggle-category-pause-id="${categoryId}" data-category-id="${categoryId}">${categoryPauseIcon}</button>
                    <button class="icon-btn delete-btn" title="删除分区" data-category-id="${categoryId}">×</button>
                </div>
            </div>
            <ul class="quote-list" id="quote-list-${categoryId}"></ul>`;
  }

  function createCategoryModuleShellElement(config = {}, options = {}) {
    const documentImpl = options.documentImpl || (typeof document !== 'undefined' ? document : null);
    if (!documentImpl || typeof documentImpl.createElement !== 'function') return null;
    const moduleEl = documentImpl.createElement('div');
    moduleEl.className = 'module';
    moduleEl.id = `module-${config.categoryId}`;
    moduleEl.innerHTML = renderCategoryModuleShell(config);
    return moduleEl;
  }

  function buildSettingsIntervalWritePlan(intervals = {}) {
    return SETTINGS_INTERVAL_FIELDS.map((field) => ({
      id: field.id,
      key: field.key,
      value: intervals[field.key]
    }));
  }

  function readSettingsIntervalFormValues(options = {}) {
    const readValue = typeof options.readValue === 'function'
      ? options.readValue
      : () => '';
    return SETTINGS_INTERVAL_FIELDS.reduce((result, field) => {
      result[field.key] = readValue(field.id);
      return result;
    }, {});
  }

  function buildSettingsIntervalsFromFormValues(values = {}, defaultIntervals = {}) {
    return SETTINGS_INTERVAL_FIELDS.reduce((result, field) => {
      const parsed = Number.parseInt(values[field.key], 10);
      result[field.key] = Number.isFinite(parsed) && parsed > 0
        ? parsed
        : defaultIntervals[field.key];
      return result;
    }, {});
  }

  function readAddCategoryFormValues(options = {}) {
    const readValue = typeof options.readValue === 'function'
      ? options.readValue
      : () => '';
    return {
      name: readValue('add-category-name')
    };
  }

  function buildAddCategoryDraft(config = {}) {
    const name = String(config.name || '').trim();
    if (!name) return null;
    return {
      name,
      id: config.categoryId,
      quotes: []
    };
  }

  function readDatasetValue(element, key) {
    return String(element && element.dataset && element.dataset[key] || '').trim();
  }

  function readDatasetNumber(element, key) {
    const value = readDatasetValue(element, key);
    return value ? Number(value) : NaN;
  }

  function hasClass(element, className) {
    if (!element) return false;
    if (element.classList && typeof element.classList.contains === 'function') {
      return element.classList.contains(className);
    }
    return String(element.className || '').split(/\s+/).includes(className);
  }

  function matchesSelector(element, selector) {
    if (!element) return false;
    if (typeof element.matches === 'function') {
      return element.matches(selector);
    }
    if (selector.startsWith('.')) {
      return hasClass(element, selector.slice(1));
    }
    return false;
  }

  function resolveClosest(event, selector, options) {
    const closestEventTarget = typeof options.closestEventTarget === 'function'
      ? options.closestEventTarget
      : () => null;
    return closestEventTarget(event, selector);
  }

  function resolveDashboardAmountInputAction(event, options = {}) {
    const input = resolveClosest(event, '.amount-input', options);
    if (!input) return { type: 'none' };

    const categoryId = readDatasetValue(input, 'categoryId');
    const quoteId = readDatasetNumber(input, 'quoteId');
    const amount = Number(input.value);
    if (!categoryId || !Number.isFinite(quoteId) || !Number.isFinite(amount) || amount < 0) {
      return { type: 'none' };
    }

    return {
      type: 'update-amount',
      categoryId,
      quoteId,
      amount
    };
  }

  function resolveDashboardClickAction(event, options = {}) {
    const dexLinkTarget = resolveClosest(event, '[data-dex-link-copy="1"]', options);
    if (dexLinkTarget) {
      return { type: 'copy-dex-link', element: dexLinkTarget };
    }

    const priceTarget = resolveClosest(event, '.quote-text-wrapper, .inverse-quote-text', options);
    if (priceTarget) {
      return { type: 'copy-price', element: priceTarget };
    }

    const button = resolveClosest(event, 'button', options);
    if (!button) return { type: 'none' };

    const categoryId = readDatasetValue(button, 'categoryId');
    const quoteId = readDatasetNumber(button, 'quoteId');

    if (matchesSelector(button, '.dismiss-highlight-btn')) {
      const dismissQuoteId = readDatasetNumber(button, 'dismissHighlightId');
      return Number.isFinite(dismissQuoteId)
        ? { type: 'dismiss-highlight', quoteId: dismissQuoteId, button }
        : { type: 'none' };
    }

    if (readDatasetValue(button, 'toggleCategoryPauseId')) {
      return categoryId
        ? { type: 'toggle-category-pause', categoryId }
        : { type: 'none' };
    }

    if (readDatasetValue(button, 'togglePauseId')) {
      const toggleQuoteId = readDatasetNumber(button, 'togglePauseId');
      return categoryId && Number.isFinite(toggleQuoteId)
        ? { type: 'toggle-quote-pause', categoryId, quoteId: toggleQuoteId }
        : { type: 'none' };
    }

    if (readDatasetValue(button, 'editAlertId')) {
      const editQuoteId = readDatasetNumber(button, 'editAlertId');
      return categoryId && Number.isFinite(editQuoteId)
        ? { type: 'edit-quote', categoryId, quoteId: editQuoteId }
        : { type: 'none' };
    }

    if (matchesSelector(button, '.delete-btn')) {
      if (categoryId && Number.isFinite(quoteId)) {
        return { type: 'delete-quote', categoryId, quoteId };
      }
      return categoryId
        ? { type: 'delete-category', categoryId }
        : { type: 'none' };
    }

    if (matchesSelector(button, '.add-quote-btn')) {
      return categoryId
        ? { type: 'add-quote', categoryId }
        : { type: 'none' };
    }

    if (matchesSelector(button, '.swap-btn')) {
      return categoryId && Number.isFinite(quoteId)
        ? { type: 'swap-quote', categoryId, quoteId }
        : { type: 'none' };
    }

    return { type: 'none' };
  }

  function resolveDashboardButtonClickAction(event, options = {}) {
    return resolveDashboardClickAction(event, options);
  }

  function buildQuoteSettingsModalViewState(config = {}) {
    const quote = config.quote && typeof config.quote === 'object' ? config.quote : {};
    const monitorState = config.monitorState && typeof config.monitorState === 'object' ? config.monitorState : {};
    const isCexOrderbookChain = typeof config.isCexOrderbookChain === 'function'
      ? config.isCexOrderbookChain
      : () => false;
    const isCrossChainQuote = typeof config.isCrossChainQuote === 'function'
      ? config.isCrossChainQuote
      : () => false;
    const isEvmChain = typeof config.isEvmChain === 'function'
      ? config.isEvmChain
      : () => false;
    const getQuoteChainDisplayName = typeof config.getQuoteChainDisplayName === 'function'
      ? config.getQuoteChainDisplayName
      : () => '';
    const getSingleChainDisplayName = typeof config.getSingleChainDisplayName === 'function'
      ? config.getSingleChainDisplayName
      : (chain) => String(chain || '');

    const isCex = isCexOrderbookChain(quote.chain);
    const isCrossChain = isCrossChainQuote(quote);
    let subtitle = quote.symbol || '';
    if (!subtitle && monitorState.fromSymbol && monitorState.toSymbol) {
      subtitle = `${monitorState.fromSymbol}/${monitorState.toSymbol}`;
    }

    const fromSymbolLabel = monitorState.fromSymbol || 'From Token';
    const toSymbolLabel = monitorState.toSymbol || 'To Token';
    const showTokenAddresses = !isCex && Boolean(quote.fromToken && quote.toToken);
    const tokenAddresses = {
      visible: showTokenAddresses,
      fromLine: '',
      toLine: ''
    };
    if (showTokenAddresses) {
      const fromChainLabel = getSingleChainDisplayName(quote.chain);
      const toChainLabel = getSingleChainDisplayName(quote.toChain || quote.chain);
      tokenAddresses.fromLine = `${fromSymbolLabel} (${fromChainLabel}) ${quote.fromToken}`;
      tokenAddresses.toLine = `${toSymbolLabel} (${toChainLabel}) ${quote.toToken}`;
    }

    const sourceSelect = {
      visible: false,
      value: '',
      disabled: false
    };
    if (isCrossChain) {
      sourceSelect.visible = true;
      sourceSelect.value = 'LI.FI';
      sourceSelect.disabled = true;
    } else if (isEvmChain(quote.chain) && String(quote.chain || '').toLowerCase() !== 'plasma') {
      sourceSelect.visible = true;
      sourceSelect.value = quote.preferredSource || 'Kyber';
    }
    const kyberExcludedSourcesVisible = sourceSelect.visible
      && !sourceSelect.disabled
      && (sourceSelect.value === 'Kyber' || sourceSelect.value === 'Auto');

    const showInverse = !(isCex || isCrossChain);
    return {
      title: `设置 · ${getQuoteChainDisplayName(quote)}`,
      subtitle: subtitle || '...',
      tokenAddresses,
      sourceSelect,
      kyberExcludedSources: {
        visible: kyberExcludedSourcesVisible,
        value: formatKyberExcludedSourcesInput(quote.kyberExcludedSources)
      },
      inverse: {
        visible: showInverse,
        checked: !!quote.showInverse
      },
      swapVisible: showInverse,
      deleteVisible: true
    };
  }

  function buildQuoteSettingsModalWritePlan(viewState = {}) {
    const tokenAddresses = viewState.tokenAddresses || {};
    const sourceSelect = viewState.sourceSelect || {};
    const kyberExcludedSources = viewState.kyberExcludedSources || {};
    const inverse = viewState.inverse || {};
    const text = [
      { id: 'modal-title', text: viewState.title || '' },
      { id: 'modal-subtitle', text: viewState.subtitle || '' }
    ];
    if (tokenAddresses.visible) {
      text.push(
        { id: 'quote-from-token-line', text: tokenAddresses.fromLine || '' },
        { id: 'quote-to-token-line', text: tokenAddresses.toLine || '' }
      );
    }

    const checked = [];
    if (inverse.visible) {
      checked.push({ id: 'show-inverse-quote', checked: inverse.checked === true });
    }

    return {
      text,
      display: [
        { id: 'quote-token-addresses', display: tokenAddresses.visible ? 'block' : 'none' },
        { id: 'source-select-group', display: sourceSelect.visible ? 'block' : 'none' },
        { id: 'kyber-excluded-sources-group', display: kyberExcludedSources.visible ? 'block' : 'none' },
        { id: 'inverse-toggle-group', display: inverse.visible ? 'flex' : 'none' },
        { id: 'modal-swap-quote', display: viewState.swapVisible ? 'block' : 'none' },
        { id: 'modal-delete-quote', display: viewState.deleteVisible ? 'block' : 'none' }
      ],
      disabled: [
        { id: 'quote-source-pref', disabled: sourceSelect.disabled === true }
      ],
      value: [
        ...(sourceSelect.value ? [{ id: 'quote-source-pref', value: sourceSelect.value }] : []),
        { id: 'kyber-excluded-sources', value: kyberExcludedSources.value || '' }
      ],
      checked
    };
  }

  function buildQuoteSettingsUpdatePlan(config = {}) {
    const quote = config.quote && typeof config.quote === 'object' ? config.quote : {};
    const isCrossChainQuote = typeof config.isCrossChainQuote === 'function'
      ? config.isCrossChainQuote
      : () => false;
    const isEvmChain = typeof config.isEvmChain === 'function'
      ? config.isEvmChain
      : () => false;
    const isCrossChain = isCrossChainQuote(quote);
    const updates = {};
    const deletes = [];
    let shouldQueueRefreshQuote = false;
    let requestChannelChanged = false;

    function setIfChanged(key, value) {
      if (quote[key] === value) return;
      updates[key] = value;
      shouldQueueRefreshQuote = true;
    }

    function deleteIfPresent(key) {
      if (!Object.prototype.hasOwnProperty.call(quote, key)) return;
      deletes.push(key);
      shouldQueueRefreshQuote = true;
    }

    if (isCrossChain) {
      setIfChanged('preferredSource', 'LI.FI');
    } else if (isEvmChain(quote.chain) && String(quote.chain || '').toLowerCase() !== 'plasma') {
      setIfChanged('preferredSource', config.sourceValue || quote.preferredSource || 'Kyber');
    }

    deleteIfPresent('kyberOnlyDirectPools');

    const selectedSource = String(config.sourceValue || quote.preferredSource || 'Kyber').trim();
    const supportsKyberSourceFilter = !isCrossChain
      && isEvmChain(quote.chain)
      && String(quote.chain || '').toLowerCase() !== 'plasma'
      && (selectedSource === 'Kyber' || selectedSource === 'Auto');
    const previousKyberExcludedSources = parseKyberExcludedSourcesInput(quote.kyberExcludedSources);
    const nextKyberExcludedSources = supportsKyberSourceFilter
      ? parseKyberExcludedSourcesInput(config.kyberExcludedSourcesInput)
      : [];
    const hasKyberExcludedSources = Object.prototype.hasOwnProperty.call(quote, 'kyberExcludedSources');

    if (nextKyberExcludedSources.length > 0) {
      if (!areStringArraysEqual(previousKyberExcludedSources, nextKyberExcludedSources)) {
        updates.kyberExcludedSources = nextKyberExcludedSources;
        shouldQueueRefreshQuote = true;
      }
    } else if (hasKyberExcludedSources) {
      deletes.push('kyberExcludedSources');
      shouldQueueRefreshQuote = true;
    }

    const showInverse = isCrossChain ? false : config.showInverse === true;
    setIfChanged('showInverse', showInverse);

    if (config.requestChannelEnabled === true) {
      const nextChannelId = config.requestChannelId || 'default';
      const previousChannelId = quote.requestChannelId || 'default';
      if (previousChannelId !== nextChannelId) {
        if (nextChannelId === 'default') {
          deletes.push('requestChannelId');
        } else {
          updates.requestChannelId = nextChannelId;
        }
        requestChannelChanged = true;
        shouldQueueRefreshQuote = true;
      }
    } else if (quote.requestChannelId) {
      deletes.push('requestChannelId');
      requestChannelChanged = true;
      shouldQueueRefreshQuote = true;
    }

    return {
      updates,
      deletes,
      shouldQueueRefreshQuote,
      requestChannelChanged
    };
  }

  function readQuoteSettingsFormValues(options = {}) {
    const readValue = typeof options.readValue === 'function'
      ? options.readValue
      : () => '';
    const readChecked = typeof options.readChecked === 'function'
      ? options.readChecked
      : () => false;
    return {
      sourceValue: readValue('quote-source-pref'),
      kyberExcludedSourcesInput: readValue('kyber-excluded-sources'),
      showInverse: readChecked('show-inverse-quote'),
      requestChannelId: readValue('quote-request-channel')
    };
  }

  function buildAddQuoteFormViewState(config = {}) {
    const chain = String(config.chain || '');
    const normalizeChainKey = typeof config.normalizeChainKey === 'function'
      ? config.normalizeChainKey
      : (value) => String(value || '').trim().toLowerCase();
    const isCexOrderbookChain = typeof config.isCexOrderbookChain === 'function'
      ? config.isCexOrderbookChain
      : () => false;
    const isEvmChain = typeof config.isEvmChain === 'function'
      ? config.isEvmChain
      : () => false;
    const placeholders = config.placeholders && typeof config.placeholders === 'object'
      ? config.placeholders
      : DEFAULT_CHAIN_ADDRESS_PLACEHOLDERS;
    const isCex = isCexOrderbookChain(chain);
    const showTargetChain = Boolean(chain && !isCex && isEvmChain(chain));
    const normalizedChain = normalizeChainKey(chain);
    const toChain = showTargetChain ? String(config.toChain || '') : '';
    const normalizedToChain = normalizeChainKey(toChain);
    const symbol = String(config.symbol || '').trim();
    const fromToken = String(config.fromToken || '').trim();
    const toToken = String(config.toToken || '').trim();

    return {
      pairFieldsVisible: Boolean(chain && !isCex),
      symbolFieldVisible: isCex,
      targetChainVisible: showTargetChain,
      toChainValue: toChain,
      fromPlaceholder: placeholders[normalizedChain] || 'Enter token address',
      toPlaceholder: placeholders[normalizedToChain || normalizedChain] || 'Enter token address',
      saveDisabled: !chain || (isCex ? !symbol : (!fromToken || !toToken))
    };
  }

  function buildAddQuoteDraft(config = {}) {
    const chain = String(config.chain || '');
    if (!chain) return null;
    const normalizeChainKey = typeof config.normalizeChainKey === 'function'
      ? config.normalizeChainKey
      : (value) => String(value || '').trim().toLowerCase();
    const isCexOrderbookChain = typeof config.isCexOrderbookChain === 'function'
      ? config.isCexOrderbookChain
      : () => false;
    const defaultSourceResolver = typeof config.defaultSourceResolver === 'function'
      ? config.defaultSourceResolver
      : () => 'Kyber';
    const quoteId = config.quoteId;
    const normalizedChain = normalizeChainKey(chain);
    const normalizedToChain = config.toChain ? normalizeChainKey(config.toChain) : '';
    const quote = {
      id: quoteId,
      chain: normalizedChain,
      amount: 1,
      preferredSource: defaultSourceResolver(chain)
    };

    if (isCexOrderbookChain(chain)) {
      const symbol = String(config.symbol || '').trim().toUpperCase();
      if (!symbol) return null;
      quote.chain = chain;
      quote.symbol = symbol;
      return quote;
    }

    const fromToken = String(config.fromToken || '').trim();
    const toToken = String(config.toToken || '').trim();
    if (!fromToken || !toToken) return null;
    quote.fromToken = fromToken;
    quote.toToken = toToken;
    if (normalizedToChain && normalizedToChain !== normalizedChain) {
      quote.toChain = normalizedToChain;
      quote.preferredSource = 'LI.FI';
      quote.showInverse = false;
    }
    return quote;
  }

  function resolveAddQuoteModalClickAction(event, options = {}) {
    const target = event && event.target;
    if (!target) return { type: 'none' };
    if (target.id === 'add-quote-cancel') return { type: 'close' };
    if (target.id === 'add-quote-save') return { type: 'save' };
    const modal = options.modal || null;
    if (modal && target === modal) {
      const insideBox = typeof target.closest === 'function' ? target.closest('.modal-box') : null;
      return insideBox ? { type: 'none' } : { type: 'close' };
    }
    return { type: 'none' };
  }

  function resolveAddCategoryModalClickAction(event, options = {}) {
    const target = event && event.target;
    if (!target) return { type: 'none' };
    if (target.id === 'add-category-cancel') return { type: 'close' };
    if (target.id === 'add-category-save') return { type: 'save' };
    const modal = options.modal || null;
    if (modal && target === modal) {
      const insideBox = typeof target.closest === 'function' ? target.closest('.modal-box') : null;
      return insideBox ? { type: 'none' } : { type: 'close' };
    }
    return { type: 'none' };
  }

  function resolveQuoteSettingsModalClickAction(event, options = {}) {
    const target = event && event.target;
    if (!target) return { type: 'none' };
    if (target.id === 'modal-cancel') return { type: 'close' };
    if (target.id === 'modal-swap-quote') return { type: 'swap' };
    if (target.id === 'modal-delete-quote') return { type: 'delete' };
    if (target.id === 'open-quote-alerts-manage') return { type: 'manage-alerts' };
    if (target.id === 'modal-save') return { type: 'save' };
    const modal = options.modal || null;
    if (modal && target === modal) {
      const insideBox = typeof target.closest === 'function' ? target.closest('.modal-box') : null;
      return insideBox ? { type: 'none' } : { type: 'close' };
    }
    return { type: 'none' };
  }

  function resolveConfirmModalClickAction(event, options = {}) {
    const target = event && event.target;
    if (!target) return { type: 'none' };
    if (target.id === 'confirm-ok') return { type: 'confirm' };
    if (target.id === 'confirm-cancel') return { type: 'close' };
    const modal = options.modal || null;
    return modal && target === modal ? { type: 'close' } : { type: 'none' };
  }

  return {
    buildAddCategoryDraft,
    buildAddQuoteDraft,
    buildAddQuoteFormViewState,
    buildQuoteSettingsModalViewState,
    buildQuoteSettingsModalWritePlan,
    buildQuoteSettingsUpdatePlan,
    buildSettingsIntervalWritePlan,
    buildSettingsIntervalsFromFormValues,
    formatKyberExcludedSourcesInput,
    parseKyberExcludedSourcesInput,
    readAddCategoryFormValues,
    readQuoteSettingsFormValues,
    readSettingsIntervalFormValues,
    resolveAddCategoryModalClickAction,
    resolveAddQuoteModalClickAction,
    resolveConfirmModalClickAction,
    resolveDashboardAmountInputAction,
    resolveDashboardButtonClickAction,
    resolveDashboardClickAction,
    resolveQuoteSettingsModalClickAction,
    createCategoryModuleShellElement,
    createQuoteItemShellElement,
    renderCategoryModuleShell,
    renderQuoteItemShell
  };
}));
