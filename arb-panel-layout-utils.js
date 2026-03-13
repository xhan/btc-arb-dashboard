(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbPanelLayoutUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function cloneSection(section, opportunities) {
    return {
      ...section,
      opportunities
    };
  }

  function splitSectionsIntoColumns(sections, columnLimit = 6, maxColumns = 2) {
    const safeSections = Array.isArray(sections) ? sections : [];
    const columns = Array.from({ length: Math.max(1, maxColumns) }, () => []);
    let columnIndex = 0;
    let usedInColumn = 0;
    const normalizedLimit = Number.isFinite(Number(columnLimit)) && Number(columnLimit) > 0
      ? Math.floor(Number(columnLimit))
      : Number.MAX_SAFE_INTEGER;

    for (const section of safeSections) {
      const opportunities = Array.isArray(section && section.opportunities) ? section.opportunities : [];
      if (!opportunities.length) {
        columns[columnIndex].push(cloneSection(section, []));
        continue;
      }

      let offset = 0;
      while (offset < opportunities.length) {
        if (columnIndex >= columns.length) {
          columns[columns.length - 1].push(cloneSection(section, opportunities.slice(offset)));
          offset = opportunities.length;
          break;
        }

        const remaining = normalizedLimit - usedInColumn;
        if (remaining <= 0 && columnIndex < columns.length - 1) {
          columnIndex += 1;
          usedInColumn = 0;
          continue;
        }

        const takeCount = columnIndex < columns.length - 1 ? Math.min(remaining, opportunities.length - offset) : opportunities.length - offset;
        columns[columnIndex].push(cloneSection(section, opportunities.slice(offset, offset + takeCount)));
        offset += takeCount;
        usedInColumn += takeCount;

        if (usedInColumn >= normalizedLimit && columnIndex < columns.length - 1) {
          columnIndex += 1;
          usedInColumn = 0;
        }
      }
    }

    return columns;
  }

  return {
    splitSectionsIntoColumns
  };
}));
