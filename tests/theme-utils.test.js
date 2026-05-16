const assert = require('assert');

const {
  buildThemeWritePlan,
  getNextTheme,
  normalizeTheme
} = require('../src/ui/theme-utils');

assert.strictEqual(normalizeTheme('light'), 'light');
assert.strictEqual(normalizeTheme('warm'), 'warm');
assert.strictEqual(normalizeTheme('dark'), 'dark');
assert.strictEqual(normalizeTheme('unknown'), 'light');

assert.strictEqual(getNextTheme('light'), 'warm');
assert.strictEqual(getNextTheme('warm'), 'dark');
assert.strictEqual(getNextTheme('dark'), 'light');
assert.strictEqual(getNextTheme('unknown'), 'warm');

assert.deepStrictEqual(
  buildThemeWritePlan('dark'),
  {
    theme: 'dark',
    body: {
      removeClasses: ['dark-mode', 'warm-mode'],
      addClasses: ['dark-mode'],
      dataset: { theme: 'dark' }
    },
    button: {
      html: '🌙',
      title: '切换主题（当前：深色）',
      ariaLabel: '切换主题（当前：深色）'
    },
    storage: {
      key: 'theme',
      value: 'dark'
    }
  }
);

assert.deepStrictEqual(buildThemeWritePlan('warm').body.addClasses, ['warm-mode']);
assert.deepStrictEqual(buildThemeWritePlan('light').body.addClasses, []);
assert.strictEqual(buildThemeWritePlan('bad').theme, 'light');
