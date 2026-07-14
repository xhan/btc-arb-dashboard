(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
    : root.ChainDefaults;
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(chainDefaults);
    return;
  }
  root.ArbPanelRenderer = factory(chainDefaults);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (chainDefaults) {
  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function defaultFormatLegLine(leg) {
    return `${leg.from} -> ${leg.to} ${leg.rate}`;
  }

  function defaultFormatProfit(profitRate) {
    return String(profitRate);
  }

  function formatDefaultChainLabel(chain) {
    if (chainDefaults && typeof chainDefaults.getChainDisplayName === 'function') {
      return chainDefaults.getChainDisplayName(chain);
    }
    return String(chain || '');
  }

  function renderQuotePriceOpportunity(entry) {
    const classNames = ['arb-opportunity', 'arb-opportunity-quote-price'];
    if (entry && entry.muted === true) classNames.push('is-muted');
    if (entry && entry.triggered === true) classNames.push('is-triggered');
    const title = entry && entry.title ? String(entry.title) : '交易对价格';
    const priceText = entry && entry.priceText ? String(entry.priceText) : '--';
    const alertText = entry && entry.alertText ? String(entry.alertText) : '';
    const statusText = entry && entry.statusText ? String(entry.statusText) : '';
    const statusHtml = statusText
      ? `<div class="arb-quote-price-status">${escapeHtml(statusText)}</div>`
      : '';
    const alertHtml = alertText
      ? `<div class="arb-quote-price-alert">${escapeHtml(alertText)}</div>`
      : '';
    const renderKey = String(entry && entry.renderKey || '');
    if (!renderKey) throw new Error(`报价关注项缺少稳定 key: ${title}`);
    return `
      <div class="${classNames.join(' ')}" data-render-key="${escapeAttr(renderKey)}">
        <div class="arb-quote-price-header">
          <div class="arb-quote-price-title">${escapeHtml(title)}</div>
          ${statusHtml}
        </div>
        <div class="arb-quote-price-value">${escapeHtml(priceText)}</div>
        ${alertHtml}
      </div>
    `;
  }

  function renderOpportunity(entry, options) {
    if (entry && entry.entryType === 'quote-price') {
      return renderQuotePriceOpportunity(entry);
    }

    const cycle = entry && entry.cycle ? entry.cycle : entry;
    const isMeaningful = typeof options.isMeaningfulPath === 'function'
      ? options.isMeaningfulPath(cycle)
      : true;
    if (!cycle || !isMeaningful) return '';

    const allLegs = Array.isArray(cycle.legs) ? cycle.legs : [];
    const displayLegs = entry && entry.hideLegs === true
      ? []
      : (typeof options.shouldIncludeLeg === 'function'
          ? allLegs.filter(options.shouldIncludeLeg)
          : allLegs);
    const legHtml = displayLegs
      .map((leg) => {
        const chainLabel = typeof options.formatChainLabel === 'function'
          ? options.formatChainLabel(leg.chain)
          : formatDefaultChainLabel(leg.chain);
        const line = (options.formatLegLine || defaultFormatLegLine)({
          ...leg,
          from: leg.from,
          to: leg.to,
          rate: leg.rate,
          chain: leg.chain,
          chainLabel
        });
        return `<div class="arb-path-line">${line}</div>`;
      })
      .join('');

    const profitClass = cycle.profitRate >= 0 ? 'arb-profit' : 'arb-profit arb-profit-neg';
    const profitText = (options.formatProfit || defaultFormatProfit)(cycle.profitRate);
    const isSpecialRuleEntry = entry && entry.entryType === 'special-rule';
    const isUnderThresholdEntry = entry && entry.entryType === 'fixed-under-threshold';
    const labelTextHtml = entry && entry.label
      ? `<div class="arb-path-line arb-opportunity-head-label"><strong>${entry.label}</strong></div>`
      : '<div class="arb-path-line arb-opportunity-head-label" aria-hidden="true"></div>';
    const profitHtml = `<div class="arb-opportunity-head-profit ${profitClass}">${profitText}</div>`;
    const displayMessage = entry && typeof entry.displayMessage === 'string'
      ? entry.displayMessage.trim()
      : '';
    const displayLineClass = isUnderThresholdEntry && Number(cycle.profitRate) > 0
      ? 'arb-path-line arb-path-display-line arb-path-display-line-positive-under-threshold'
      : 'arb-path-line arb-path-display-line';
    const displayMessageHtml = displayMessage
      ? displayMessage
        .split('\n')
        .map((line) => String(line || '').trim())
        .map((line) => (
          line
            ? `<div class="${displayLineClass}">${escapeHtml(line)}</div>`
            : '<div class="arb-path-line arb-path-display-line arb-path-display-line-empty">&nbsp;</div>'
        ))
        .join('')
      : '';
    const labelHtml = (isSpecialRuleEntry || isUnderThresholdEntry)
      ? ''
      : `
      <div class="arb-opportunity-head">
        ${labelTextHtml}
        <div class="arb-opportunity-head-actions">${profitHtml}</div>
      </div>
    `;
    const opportunityId = entry && entry.opportunityId ? String(entry.opportunityId) : '';
    const classNames = ['arb-opportunity'];
    if (isSpecialRuleEntry) {
      classNames.push('arb-opportunity-special-body');
    }
    if (isUnderThresholdEntry) {
      classNames.push('arb-opportunity-fixed-under-threshold');
    }
    if (entry && entry.isAlertHighlighted === true) {
      classNames.push('is-alert-highlight');
    }
    const className = classNames.join(' ');
    const clickableAttrs = opportunityId && entry && entry.clickable !== false
      ? ` data-arb-opportunity-id="${escapeAttr(opportunityId)}" role="button" tabindex="0"`
      : '';
    const renderKey = String(entry && entry.renderKey || '') || opportunityId;
    if (!renderKey) throw new Error('套利机会缺少稳定 key');

    return `<div class="${className}" data-render-key="opportunity:${escapeAttr(renderKey)}"${clickableAttrs}>${labelHtml}${displayMessageHtml}${legHtml}</div>`;
  }

  function renderSection(section, options) {
    const opportunities = Array.isArray(section && section.opportunities)
      ? section.opportunities
      : [];
    const rendered = opportunities
      .map((entry) => renderOpportunity(entry, options))
      .filter(Boolean);

    const emptyText = section && section.emptyText ? section.emptyText : '等待数据...';
    const body = rendered.length
      ? rendered.join('')
      : `<div class="arb-path-line arb-path-empty">${escapeHtml(emptyText)}</div>`;

    const title = section && section.title ? section.title : '';
    const titleProfitRate = section && Number.isFinite(section.titleProfitRate)
      ? section.titleProfitRate
      : null;
    const titleProfitClass = titleProfitRate != null && titleProfitRate >= 0
      ? 'arb-profit'
      : 'arb-profit arb-profit-neg';
    const titleRowHtml = section && section.sectionType === 'special-rule'
      ? `<div class="arb-section-title-row"><div class="arb-section-title">${escapeHtml(title)}</div>${titleProfitRate != null ? `<div class="arb-section-title-profit ${titleProfitClass}">${escapeHtml((options.formatProfit || defaultFormatProfit)(titleProfitRate))}</div>` : ''}</div>`
      : `<div class="arb-section-title">${escapeHtml(title)}</div>`;
    const headerExtraHtml = section && section.headerExtraHtml ? section.headerExtraHtml : '';
    const footerHtml = section && section.footerHtml ? section.footerHtml : '';
    const sectionClassName = section && section.sectionType === 'special-rule'
      ? 'arb-section arb-section-special'
      : 'arb-section';
    const renderKey = String(section && section.renderKey || '');
    if (!renderKey) throw new Error(`套利 section 缺少稳定 key: ${title || '--'}`);

    return `<div class="${sectionClassName}" data-render-key="section:${escapeAttr(renderKey)}">${titleRowHtml}${headerExtraHtml}${body}${footerHtml}</div>`;
  }

  function renderArbSectionToggleHtml(sectionKey, cycleDisplayState) {
    if (!cycleDisplayState || !cycleDisplayState.canToggleExpand) return '';

    const numericMinProfitBp = Number(cycleDisplayState.displayMinProfitBp);
    const minProfitBp = Number.isFinite(numericMinProfitBp) ? Math.max(0, numericMinProfitBp) : 0;
    const buttonText = cycleDisplayState.expanded
      ? `已展开 ${cycleDisplayState.positiveCount} 条 > ${minProfitBp}bp，点击收起`
      : `还有 ${cycleDisplayState.hiddenPositiveCount} 条 > ${minProfitBp}bp 未显示，点击展开全部`;

    return `
            <button
                type="button"
                class="arb-path-expand-toggle"
                data-arb-section-key="${escapeAttr(sectionKey)}"
                aria-expanded="${cycleDisplayState.expanded ? 'true' : 'false'}"
                style="margin-top:6px;padding:0;border:none;background:none;color:#2563eb;cursor:pointer;font-size:12px;text-decoration:underline;"
            >${escapeHtml(buttonText)}</button>
        `;
  }

  function renderArbGrid(config = {}) {
    const columns = Array.isArray(config.columns) ? config.columns : [];
    const columnKeys = Array.isArray(config.columnKeys) ? config.columnKeys : [];
    const options = {
      isMeaningfulPath: config.isMeaningfulPath,
      shouldIncludeLeg: config.shouldIncludeLeg,
      formatLegLine: config.formatLegLine,
      formatChainLabel: config.formatChainLabel,
      formatProfit: config.formatProfit
    };

    const columnHtml = columns.map((sections, index) => {
      const safeSections = Array.isArray(sections) ? sections : [];
      const columnKey = String(columnKeys[index] || '');
      if (!columnKey) throw new Error(`套利 column ${index} 缺少稳定 key`);
      const sectionHtml = safeSections.map((section) => renderSection(section, options)).join('');
      return `<div class="arb-column" data-render-key="column:${escapeAttr(columnKey)}">${sectionHtml}</div>`;
    }).join('');

    return `<div class="arb-path-grid">${columnHtml}</div>`;
  }

  function applyArbPanelErrorText(contentEl, errorText) {
    if (!contentEl) return false;
    contentEl.textContent = String(errorText || '');
    return true;
  }

  function readDatasetValue(element, key) {
    return String(element && element.dataset && element.dataset[key] || '').trim();
  }

  function resolveClosest(event, selector, options) {
    const closestEventTarget = typeof options.closestEventTarget === 'function'
      ? options.closestEventTarget
      : () => null;
    return closestEventTarget(event, selector);
  }

  function resolveArbPathContentClickAction(event, options = {}) {
    const containsElement = typeof options.containsElement === 'function'
      ? options.containsElement
      : () => true;
    const toggleBtn = resolveClosest(event, '.arb-path-expand-toggle', options);
    if (toggleBtn && containsElement(toggleBtn)) {
      const sectionKey = readDatasetValue(toggleBtn, 'arbSectionKey');
      return sectionKey
        ? { type: 'toggle-section', sectionKey }
        : { type: 'none' };
    }

    const opportunityEl = resolveClosest(event, '[data-arb-opportunity-id]', options);
    const opportunityId = readDatasetValue(opportunityEl, 'arbOpportunityId');
    return opportunityId
      ? { type: 'open-opportunity', opportunityId }
      : { type: 'none' };
  }

  function resolveArbPathContentPointerDownAction(event, options = {}) {
    if (event && typeof event.button === 'number' && event.button !== 0) {
      return { type: 'none' };
    }
    if (resolveClosest(event, '.arb-path-expand-toggle', options)) {
      return { type: 'none' };
    }

    const opportunityEl = resolveClosest(event, '[data-arb-opportunity-id]', options);
    const opportunityId = readDatasetValue(opportunityEl, 'arbOpportunityId');
    return opportunityId
      ? { type: 'open-opportunity', opportunityId }
      : { type: 'none' };
  }

  function resolveArbPathContentKeydownAction(event, options = {}) {
    const opportunityEl = resolveClosest(event, '[data-arb-opportunity-id]', options);
    const opportunityId = readDatasetValue(opportunityEl, 'arbOpportunityId');
    if (!opportunityId) return { type: 'none' };
    const key = event && event.key;
    if (key !== 'Enter' && key !== ' ') return { type: 'none' };
    return { type: 'open-opportunity', opportunityId };
  }

  return {
    applyArbPanelErrorText,
    resolveArbPathContentClickAction,
    resolveArbPathContentKeydownAction,
    resolveArbPathContentPointerDownAction,
    renderArbSectionToggleHtml,
    renderArbGrid
  };
}));
