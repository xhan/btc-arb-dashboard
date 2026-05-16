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

  function applyThemeWritePlan(plan, refs = {}) {
    if (!plan || typeof plan !== 'object') return false;
    const body = refs.body || null;
    const button = refs.button || null;
    const storage = refs.storage || null;

    if (body && body.classList && plan.body) {
      body.classList.remove(...(plan.body.removeClasses || []));
      (plan.body.addClasses || []).forEach((className) => {
        body.classList.add(className);
      });
      if (body.dataset && plan.body.dataset) {
        body.dataset.theme = plan.body.dataset.theme;
      }
    }

    if (button && plan.button) {
      button.innerHTML = plan.button.html;
      button.title = plan.button.title;
      button.setAttribute('aria-label', plan.button.ariaLabel);
    }

    if (storage && plan.storage && typeof storage.setItem === 'function') {
      storage.setItem(plan.storage.key, plan.storage.value);
    }

    return true;
  }

  return {
    applyThemeWritePlan,
    buildThemeWritePlan,
    getNextTheme,
    normalizeTheme
  };
});
