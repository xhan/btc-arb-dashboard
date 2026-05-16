const assert = require('assert');

const {
  normalizeSpecialRuleAlertConfig,
  evaluateSpecialRuleTrigger
} = require('../src/alerts/special-rule-alert-config-utils');

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

assert.deepStrictEqual(
  evaluateSpecialRuleTrigger(
    {
      primary: {
        netProfit: 15.9,
        netProfitBp: 0.1
      },
      targetResults: [
        { targetAmount: 100000, profit: 10.2, profitBp: 1.0 },
        { targetAmount: 200000, profit: 13.9, profitBp: 0.7 }
      ]
    },
    {
      minNetProfit: 8,
      minNetProfitBp: 0.6
    }
  ),
  {
    meetsTriggerCondition: true,
    netProfit: 10.2,
    minNetProfit: 8,
    netProfitBp: 1.0,
    minNetProfitBp: 0.6
  }
);

assert.deepStrictEqual(
  evaluateSpecialRuleTrigger(
    {
      primary: {
        netProfit: 15.9,
        netProfitBp: 0.1
      },
      targetResults: [
        { targetAmount: 100000, profit: 10.2, profitBp: 0.5 }
      ]
    },
    {
      minNetProfit: 8,
      minNetProfitBp: 0.6
    }
  ),
  {
    meetsTriggerCondition: false,
    netProfit: 10.2,
    minNetProfit: 8,
    netProfitBp: 0.5,
    minNetProfitBp: 0.6
  }
);
