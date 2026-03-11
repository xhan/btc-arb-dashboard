# Velora cbBTC/WBTC 对比结论

更新时间：`2026-03-10`

## 目的

对比 Ethereum 主网 `cbBTC <-> WBTC` 这组报价，在以下场景下 Velora 与 Kyber 的差别：

- `kyber`
- `velora-default`
- `velora-include-empty`
- `velora-include-all`
- `velora-other-off`
- `velora-other-on`

其中：

- `velora-include-all` 使用 `https://api.paraswap.io/adapters/list/1` 返回的全部 adapter
- 本次实测 adapter 数量为 `31`
- 本次运行未传 `partner`

运行命令：

```bash
npm run velora:compare -- --timeout-ms 15000
```

脚本位置：

- `scripts/velora-market-compare.js`

## 实测结果

### 1 cbBTC -> WBTC

| 场景 | amountOut |
| --- | ---: |
| Kyber | `1.00237425` |
| Velora default | `1.00237345` |
| Velora include empty | `1.00237345` |
| Velora include all | `1.00229403` |
| Velora other off | `1.00237345` |
| Velora other on | `1.00237345` |

### 1 WBTC -> cbBTC

| 场景 | amountOut |
| --- | ---: |
| Kyber | `0.99752023` |
| Velora default | `0.99752128` |
| Velora include empty | `0.99752128` |
| Velora include all | `0.99751615` |
| Velora other off | `0.99752128` |
| Velora other on | `0.99752128` |

## 复测结果

同一天再次执行：

```bash
npm run velora:compare -- --timeout-ms 15000
```

### 1 cbBTC -> WBTC

| 场景 | amountOut |
| --- | ---: |
| Kyber | `1.00237376` |
| Velora default | `1.00237292` |
| Velora include empty | `1.00237292` |
| Velora include all | `1.00229399` |
| Velora other off | `1.00237292` |
| Velora other on | `1.00237292` |

### 1 WBTC -> cbBTC

| 场景 | amountOut |
| --- | ---: |
| Kyber | `0.99751181` |
| Velora default | `0.99750874` |
| Velora include empty | `0.99750874` |
| Velora include all | `0.99750789` |
| Velora other off | `0.99750874` |
| Velora other on | `0.99750874` |

## 结论

1. `Velora include all` 在两次样本里都更差。

- 第一次：
  - `cbBTC -> WBTC`：`1.00229403`，低于 `Velora default` 的 `1.00237345`
  - `WBTC -> cbBTC`：`0.99751615`，低于 `Velora default` 的 `0.99752128`
- 第二次：
  - `cbBTC -> WBTC`：`1.00229399`，低于 `Velora default` 的 `1.00237292`
  - `WBTC -> cbBTC`：`0.99750789`，低于 `Velora default` 的 `0.99750874`

2. `Velora include empty` 和 `Velora default` 在两次样本里都没有观测到差异。

这说明至少对这组交易对和这次时点来说，默认路径和“不给 includeDEXS”得到的结果一致。

3. `otherExchangePrices` 开和关，在两次样本里都没有带来报价改善。

也就是：

- `velora-other-off = velora-default`
- `velora-other-on = velora-default`

至少对 `cbBTC/WBTC` 这组对，这个开关没有带来可见改善。第二次样本里，`WBTC -> cbBTC` 的 `other-on` 耗时还明显更高，达到 `3821ms`，但报价没有变好。

4. Kyber 与 Velora default 的差距很小，但 Kyber 在这两次样本里整体更稳一些。

- `cbBTC -> WBTC`：两次都是 Kyber 略好
- `WBTC -> cbBTC`：第一次 Velora default 略好，第二次则是 Kyber 略好

差距都很小，数量级大约在 `0.01 ~ 0.03 bps`

## 解释建议

对于这组交易对，当前更实际的理解是：

- `includeDEXS=all` 不是“越多越好”
- 它会改变 Velora 的候选池和路径选择
- 在这次样本里，反而让结果更差

所以如果目标只是稳定询价，当前更建议：

- 默认不要设置 `includeDEXS=all`
- `includeDEXS` 优先保持未设置
- 如果你只是为了“尽量全”，不要把 adapter 全量塞进去
- `otherExchangePrices` 保持默认关闭，至少这组交易对上没有带来收益，且可能增加耗时
- 真要调优，应该按具体交易对逐组实测，而不是预设“全开一定更优”

## 配置建议

基于 `2026-03-10` 的两次实时样本，对 `cbBTC <-> WBTC` 这组对的建议是：

```json
{
  "veloraIncludeDEXS": [],
  "veloraOtherExchangePrices": false
}
```

更准确地说：

- 生产默认值建议：`veloraIncludeDEXS` 不配置
- 如果配置层必须显式写值，再写成空数组 `[]`
- `veloraOtherExchangePrices` 建议保持 `false`

如果后面你要扩到更多 BTC 包装资产对，可以继续沿用这个脚本逐对验证，再决定是否给某一小组 token 做特化配置。

## 注意

这份结论来自 `2026-03-10` 的一次实时样本，不代表任意时刻都成立。  
如果后面要拿它做生产参数，建议至少做：

- 多轮重复采样
- 不同时段采样
- 统计平均值、中位数、最优值、最差值
- 分开看报价和响应耗时
