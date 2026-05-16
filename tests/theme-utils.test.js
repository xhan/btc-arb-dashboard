const assert = require('assert');

const {
  applyThemeWritePlan,
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

const bodyClasses = new Set(['dark-mode', 'warm-mode', 'other-class']);
const bodyEl = {
  dataset: {},
  classList: {
    add(className) {
      bodyClasses.add(className);
    },
    remove(...classNames) {
      classNames.forEach((className) => bodyClasses.delete(className));
    }
  }
};
const themeButton = {
  innerHTML: '',
  title: '',
  attributes: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
};
const themeStorageWrites = [];
const storage = {
  setItem(key, value) {
    themeStorageWrites.push([key, value]);
  }
};
assert.strictEqual(
  applyThemeWritePlan(buildThemeWritePlan('warm'), {
    body: bodyEl,
    button: themeButton,
    storage
  }),
  true
);
assert.deepStrictEqual(Array.from(bodyClasses).sort(), ['other-class', 'warm-mode']);
assert.strictEqual(bodyEl.dataset.theme, 'warm');
assert.strictEqual(themeButton.innerHTML, '🌤️');
assert.strictEqual(themeButton.title, '切换主题（当前：暖色）');
assert.strictEqual(themeButton.attributes['aria-label'], '切换主题（当前：暖色）');
assert.deepStrictEqual(themeStorageWrites, [['theme', 'warm']]);
assert.strictEqual(applyThemeWritePlan(null, { body: bodyEl }), false);
