const assert = require('assert');

const {
  normalizeSpecialRuleAlertConfig
} = require('../special-rule-alert-config-utils');

assert.deepStrictEqual(
  normalizeSpecialRuleAlertConfig({ minNetProfit: 8, minNetProfitBp: 0.5 }),
  { minNetProfit: 8, minNetProfitBp: 0.5 }
);

assert.deepStrictEqual(
  normalizeSpecialRuleAlertConfig({}, { minNetProfit: 10, minNetProfitBp: 1.5 }),
  { minNetProfit: 10, minNetProfitBp: 1.5 }
);

assert.deepStrictEqual(
  normalizeSpecialRuleAlertConfig({ minNetProfit: -1, minNetProfitBp: 'x' }),
  {}
);
