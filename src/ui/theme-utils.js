(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.ThemeUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.ThemeUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const THEME_ORDER = ['light', 'warm', 'dark'];
  const THEME_META = {
    light: { icon: '☀️', title: '切换主题（当前：浅色）' },
    warm: { icon: '🌤️', title: '切换主题（当前：暖色）' },
    dark: { icon: '🌙', title: '切换主题（当前：深色）' }
  };

  function normalizeTheme(theme) {
    return THEME_ORDER.includes(theme) ? theme : 'light';
  }

  function getNextTheme(currentTheme) {
    const index = THEME_ORDER.indexOf(normalizeTheme(currentTheme));
    return THEME_ORDER[(index + 1) % THEME_ORDER.length];
  }

  function buildThemeWritePlan(theme) {
    const nextTheme = normalizeTheme(theme);
    const meta = THEME_META[nextTheme];
    const bodyClasses = [];
    if (nextTheme === 'dark') bodyClasses.push('dark-mode');
    if (nextTheme === 'warm') bodyClasses.push('warm-mode');
    return {
      theme: nextTheme,
      body: {
        removeClasses: ['dark-mode', 'warm-mode'],
        addClasses: bodyClasses,
        dataset: { theme: nextTheme }
      },
      button: {
        html: meta.icon,
        title: meta.title,
        ariaLabel: meta.title
      },
      storage: {
        key: 'theme',
        value: nextTheme
      }
    };
  }

  return {
    buildThemeWritePlan,
    getNextTheme,
    normalizeTheme
  };
});
