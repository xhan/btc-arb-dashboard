(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbPanelRenderer = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function defaultFormatLegLine(leg) {
    return `${leg.from} -> ${leg.to} ${leg.rate}`;
  }

  function defaultFormatProfit(profitRate) {
    return String(profitRate);
  }

  function renderOpportunity(entry, options) {
    const cycle = entry && entry.cycle ? entry.cycle : entry;
    const isMeaningful = typeof options.isMeaningfulPath === 'function'
      ? options.isMeaningfulPath(cycle)
      : true;
    if (!cycle || !isMeaningful) return '';

    const allLegs = Array.isArray(cycle.legs) ? cycle.legs : [];
    const displayLegs = typeof options.shouldIncludeLeg === 'function'
      ? allLegs.filter(options.shouldIncludeLeg)
      : allLegs;
    const legHtml = displayLegs
      .map((leg) => {
        const chainLabel = typeof options.formatChainLabel === 'function'
          ? options.formatChainLabel(leg.chain)
          : (leg.chain || '');
        const line = (options.formatLegLine || defaultFormatLegLine)({
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
    const chartHref = entry && entry.chartHref ? String(entry.chartHref) : '/charts';
    const chartLinkHtml = `<a class="arb-opportunity-chart-link" href="${escapeAttr(chartHref)}" target="_blank" rel="noopener noreferrer" title="打开历史图表">↗</a>`;
    const labelTextHtml = entry && entry.label
      ? `<div class="arb-path-line"><strong>${entry.label}</strong></div>`
      : '';
    const labelHtml = `
      <div class="arb-opportunity-head">
        ${labelTextHtml || '<div class="arb-path-line"><strong>历史图表</strong></div>'}
        ${chartLinkHtml}
      </div>
    `;
    const opportunityId = entry && entry.opportunityId ? String(entry.opportunityId) : '';
    const clickableAttrs = opportunityId
      ? ` data-arb-opportunity-id="${escapeAttr(opportunityId)}" role="button" tabindex="0"`
      : '';

    return `<div class="arb-opportunity"${clickableAttrs}>${labelHtml}${legHtml}<div class="${profitClass}">收益: ${profitText}</div></div>`;
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
      : `<div class="arb-path-line">${emptyText}</div>`;

    const title = section && section.title ? section.title : '';
    const headerExtraHtml = section && section.headerExtraHtml ? section.headerExtraHtml : '';
    const footerHtml = section && section.footerHtml ? section.footerHtml : '';

    return `<div class="arb-section"><div class="arb-section-title">${title}</div>${headerExtraHtml}${body}${footerHtml}</div>`;
  }

  function renderArbGrid(config = {}) {
    const columns = Array.isArray(config.columns) ? config.columns : [];
    const options = {
      isMeaningfulPath: config.isMeaningfulPath,
      shouldIncludeLeg: config.shouldIncludeLeg,
      formatLegLine: config.formatLegLine,
      formatChainLabel: config.formatChainLabel,
      formatProfit: config.formatProfit
    };

    const columnHtml = columns.map((sections) => {
      const safeSections = Array.isArray(sections) ? sections : [];
      const sectionHtml = safeSections.map((section) => renderSection(section, options)).join('');
      return `<div class="arb-column">${sectionHtml}</div>`;
    }).join('');

    return `<div class="arb-path-grid">${columnHtml}</div>`;
  }

  return {
    renderArbGrid
  };
}));
