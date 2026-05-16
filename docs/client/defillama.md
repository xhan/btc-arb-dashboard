# DefiLlama Swap API 记录

基于对页面 [swap.defillama.com](https://swap.defillama.com/?chain=ethereum&from=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&tab=swap&to=0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f) 的实际抓包整理，时间为 2026-03-11。

本文重点记录：

- DefiLlama 页面如何拿报价
- 它调用的 Kyber / ParaSwap 与本项目现有接入的区别
- 对限频问题的判断

## 结论

- DefiLlama 没有一个统一的单一报价 API。
- 在 `You sell` 里填入数量后，前端会并发请求多个聚合器，然后把结果汇总排序。
- 这次抓到的主要报价来源有：
  - ParaSwap
  - KyberSwap
  - Odos
  - CoW Swap
  - DefiLlama 自己的 `swap-api.defillama.com/dexAggregatorQuote` 包装层，用来转发 1inch、Matcha/0x v2 等聚合器

以这次页面参数为例：

- 链：`ethereum`
- `from`: `USDC` `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
- `to`: `GHO` `0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f`

USDC 是 6 位精度，所以在 `You sell` 中输入 `10000` 后，真正传给接口的是：

```text
10000000000
```

## 报价触发条件

- 页面只有在输入数量后，才会真正发起路由报价请求。
- 不填数量，或者数量为 `0`，不会进入完整报价流程。

## 首轮报价接口

### ParaSwap

```text
GET https://apiv5.paraswap.io/prices/?srcToken=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&destToken=0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f&amount=10000000000&srcDecimals=6&destDecimals=18&partner=llamaswap&side=SELL&network=1&excludeDEXS=ParaSwapPool,ParaSwapLimitOrders&version=6.2
```

常用返回字段：

- `priceRoute.srcAmount`
- `priceRoute.destAmount`
- `priceRoute.gasCostUSD`
- `priceRoute.bestRoute`

### KyberSwap

```text
GET https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&tokenOut=0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f&amountIn=10000000000&gasInclude=true
```

常用返回字段：

- `data.routeSummary.amountIn`
- `data.routeSummary.amountOut`
- `data.routeSummary.gas`
- `data.routeSummary.gasUsd`
- `data.routeSummary.route`

### Odos

```text
POST https://api.odos.xyz/sor/quote/v2
```

关键 body 字段：

- `chainId`
- `inputTokens[0].tokenAddress`
- `inputTokens[0].amount`
- `outputTokens[0].tokenAddress`
- `slippageLimitPercent`

常用返回字段：

- `outAmounts[0]`
- `outValues[0]`
- `gasEstimateValue`
- `pathId`

### CoW Swap

```text
POST https://api.cow.fi/mainnet/api/v1/quote
```

关键 body 字段：

- `sellToken`
- `buyToken`
- `sellAmountBeforeFee`
- `kind: "sell"`

常用返回字段：

- `quote.sellAmount`
- `quote.buyAmount`
- `quote.feeAmount`

### DefiLlama 包装层

```text
POST https://swap-api.defillama.com/dexAggregatorQuote?protocol=1inch&chain=ethereum&from=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&to=0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f&amount=10000000000&api_key=...
```

同类的还有：

- `protocol=Matcha/0x v2`
- `protocol=0x Gasless`

常用返回字段：

- `amountReturned`
- `estimatedGas`
- `tokenApprovalAddress`
- `rawQuote`

直接用服务端 `curl` 访问这层接口时，我拿到的是 Cloudflare challenge `403`；浏览器环境里正常返回 JSON。也就是说，这层更像是浏览器可用包装层，不适合直接作为我们服务端长期依赖的主入口。

## 二次交易构建接口

拿到首轮报价后，DefiLlama 还会继续请求交易构建接口：

### ParaSwap

```text
POST https://apiv5.paraswap.io/transactions/1?ignoreChecks=true
```

### KyberSwap

```text
POST https://aggregator-api.kyberswap.com/ethereum/api/v1/route/build
```

### Odos

```text
POST https://api.odos.xyz/sor/assemble
```

这些不是首轮报价接口，而是拿 route 结果继续拼交易数据。

## DefiLlama 里的 Kyber header

这次抓到 DefiLlama 对 Kyber 显式设置的自定义 header 是：

```text
x-client-id: llamaswap
```

具体体现在：

- `GET /api/v1/routes`
- `POST /api/v1/route/build`

除此之外，浏览器还会自然带上标准头，例如：

- `accept`
- `user-agent`
- `sec-fetch-*`
- `origin`
- `referer`

但这些不是 DefiLlama 代码单独设置的业务 header。

## DefiLlama 里的 ParaSwap header

这次抓到的 ParaSwap 请求里：

- `GET /prices` 没有看到额外的自定义业务 header
- `POST /transactions/1` 显式设置了 `Content-Type: application/json`

同样，浏览器会自然附带标准请求头，但没有看到类似 Kyber 这种 `x-client-id` 风格的业务 header。

## Hide IP 开关的变化

在 2026-03-12 重新实测后，`Hide IP` 开关的影响很明确。

### Hide IP 关闭

浏览器会直接请求第三方聚合器：

- `https://apiv5.paraswap.io/prices`
- `https://aggregator-api.kyberswap.com/.../routes`
- `https://api.odos.xyz/sor/quote/v2`
- `https://api.cow.fi/mainnet/api/v1/quote`
- 以及本来就走中转的 `swap-api.defillama.com/dexAggregatorQuote`

这时：

- Kyber 直连请求里能看到 `x-client-id: llamaswap`
- ParaSwap 直连请求仍然是 `partner=llamaswap`

### Hide IP 开启

浏览器不再直接访问 `ParaSwap / Kyber / Odos / CoW`，而是统一改成调用：

- `POST https://swap-api.defillama.com/dexAggregatorQuote?protocol=ParaSwap...`
- `POST https://swap-api.defillama.com/dexAggregatorQuote?protocol=KyberSwap...`
- `POST https://swap-api.defillama.com/dexAggregatorQuote?protocol=Odos...`
- `POST https://swap-api.defillama.com/dexAggregatorQuote?protocol=CowSwap...`

这时请求体里会带：

```json
{
  "isPrivacyEnabled": true
}
```

而浏览器侧已经看不到对 `Kyber / ParaSwap` 的直连请求，所以也看不到它们上游实际收到的 header。

### Cookie 试验

我额外做了一次对照实验，专门验证 `Hide IP` 是否依赖 cookie：

- 真实浏览器上下文里，`.defillama.com` 下确实存在 `cf_clearance` 和 `posthog` cookie
- 但抓到的 `swap-api.defillama.com/dexAggregatorQuote` 实际请求头里，没有看到浏览器显式发送 `cookie`
- 我又把浏览器里的 `cf_clearance` 和 `posthog` cookie 原样手工带到服务端脚本请求里重试
- 结果没有变化，`ParaSwap / KyberSwap` 的 `Hide IP` 请求仍然都是 Cloudflare challenge `403`

当前判断：

- 至少对现阶段这条链路来说，单纯补 `cookie` 不能让服务端脚本复刻网页里的 `Hide IP`
- 更可能卡在 Cloudflare challenge、本地 TLS/HTTP 指纹、真浏览器运行时环境这些层面

### 后续思路

如果后面还要继续验证 `Hide IP` 的真实限频表现，方向应该切到浏览器自动化，而不是继续堆服务端 header：

- 用 `Playwright` 或 `Chrome DevTools Protocol` 驱动真浏览器
- 直接在页面里输入数量，复用浏览器自己的 cookie、TLS 指纹、HTTP/2 行为和 challenge 结果
- 统计页面实际发出的 `swap-api.defillama.com` 请求成功率、状态码和响应时间
- 把这条链路和当前服务端直连 `ParaSwap / Kyber` 的压测结果分开记录，不混在同一脚本里

### 这意味着什么

- `Hide IP` 对网页用户来说，确实能把上游聚合器看到的来源 IP 从“用户浏览器”切到“DefiLlama 服务端”。
- 但它不是一个稳定可复用的服务端绕路方案，因为我们直接请求 `swap-api.defillama.com` 时，会遇到 Cloudflare challenge。
- 同时，DefiLlama 自己的 `rpc.llama-rpc.com` 也可能出现 `429`，所以这不是“无限制通道”。

## 与本项目现有接入的区别

下面的对比基于当前仓库实现：

- [src/market-clients/providers/kyber.js](/Users/xhan/Desktop/market_diff/src/market-clients/providers/kyber.js)
- [src/market-clients/providers/velora.js](/Users/xhan/Desktop/market_diff/src/market-clients/providers/velora.js)
- [scripts/velora-market-api.js](/Users/xhan/Desktop/market_diff/scripts/velora-market-api.js)

### Kyber：接口同一套，但参数和 header 更简

本项目当前调用：

```text
GET https://aggregator-api.kyberswap.com/{chain}/api/v1/routes?tokenIn=...&tokenOut=...&amountIn=...
```

当前实现特点：

- 显式带 `X-Client-Id: <configMore.kyberClientId>`
- 不带 `gasInclude=true`
- 不调用 `POST /route/build`

DefiLlama 调用特点：

- 同样使用 `GET /api/v1/routes`
- 显式带 `x-client-id: llamaswap`
- 额外带 `gasInclude=true`
- 后续还会调 `POST /route/build`

结论：

- Kyber 不是“不同接口”，而是“同一接口族，DefiLlama 参数更多、client id 不同、链路更完整”。

## ParaSwap：不是同一个 hostname

本项目当前调用：

```text
GET https://api.paraswap.io/prices/?...
```

DefiLlama 抓到的是：

```text
GET https://apiv5.paraswap.io/prices/?...
```

两者差异：

- hostname 不同：
  - 我们：`api.paraswap.io`
  - DefiLlama：`apiv5.paraswap.io`
- 参数模型非常接近，都是：
  - `srcToken`
  - `destToken`
  - `amount`
  - `srcDecimals`
  - `destDecimals`
  - `side=SELL`
  - `network`
  - `version=6.2`
- DefiLlama 额外带了：
  - `partner=llamaswap`
  - `excludeDEXS=ParaSwapPool,ParaSwapLimitOrders`
- 本项目当前支持按配置带：
  - `partner`
  - `includeDEXS`
  - `otherExchangePrices`

从 Velora 官方文档看，当前公开推荐入口仍然是：

- [Velora Market API: /prices](https://developers.velora.xyz/api/velora-api/velora-market-api/get-rate-for-a-token-pair)

也就是 `api.paraswap.io/prices` 这一套。  
因此，`apiv5.paraswap.io` 更像是 ParaSwap / Velora 自己使用的另一套边缘域名或兼容域名，而不是官方文档主推的服务端集成入口。这是基于官方文档与实抓流量的推断。

## 为什么 DefiLlama 看起来没那么容易撞限频

目前看，不像是它掌握了什么“突破限制”的特殊方法，更像是以下几件事叠加：

- 它把请求分散到多个聚合器，不是只压单一来源
- Kyber 请求显式带了自己的 `x-client-id`
- ParaSwap 请求带了 `partner=llamaswap`
- 页面流量模式更接近真实用户输入，不像我们这种固定频率轮询
- 它很多请求是在浏览器里发起，天然长得更像正常前端流量

换句话说，DefiLlama 的优势更像是“请求身份 + 请求模式 + 流量分摊”，而不是“偷偷绕过限流”。

## 对限频问题的判断

如果目标是长期稳定拿数据，重点不应该放在“怎么绕”，而应该放在“怎么降压 + 怎么拿到更稳的配额”。

### Kyber

更可行的方向：

- 固定使用稳定的 `X-Client-Id`
- 如有可能，和 Kyber 侧确认配额或接入策略
- 仅在真正需要时才带 `gasInclude=true`
- 减少重复、同参数的高频重查

参考：

- [Kyber Aggregator API 文档](https://docs.kyberswap.com/kyberswap-solutions/kyberswap-aggregator/aggregator-api-specification/evm-swaps)

### ParaSwap / Velora

更可行的方向：

- 优先使用官方文档推荐的 `api.paraswap.io`
- 明确 `partner` 身份
- 根据业务场景控制 `includeDEXS` / `otherExchangePrices`
- 如果确实有大流量需求，优先和官方谈接入与限频策略

参考：

- [Velora Market API 文档](https://developers.velora.xyz/api/velora-api/velora-market-api/get-rate-for-a-token-pair)

### 本项目侧

更值得先做的优化：

- 对同链、同 token 对、同 amount 的请求做短 TTL 去重
- 轮询间隔做自适应退避，不要固定压到最小
- 反向报价与正向报价分时调度，避免瞬时 burst
- 先用现有结果做路径筛选，只对候选路径请求更贵的聚合报价
- 把失败率、429/403 比例、平均响应时间记录下来，按来源分别观测

## 当前判断

- Kyber：DefiLlama 和我们项目用的是同一套核心报价接口，不是不同 API。
- ParaSwap：hostname 的确不同，但参数模型和返回结构属于同一路系，不是完全不同产品。
- 目前没有证据表明 DefiLlama 在做“可复用的限频突破”；更像是 partner / client-id / 请求模式 / 浏览器环境共同作用。

## Rate Limit 测试结果同步

### ParaSwap

目前这轮服务端直连测试里，可以先按下面的结论使用：

- `700ms` 间隔相对安全
- 直接使用公开 API 也能工作
- 即使不额外提供 `partner`，当前看也不是硬要求
- 不需要为了 ParaSwap 特意复刻 DefiLlama 的调用方式

换句话说，ParaSwap 这边优先用公开接口和更保守的请求频率即可，现阶段没必要为了“更像 DefiLlama”再堆额外 header 或参数。

### Kyber

Kyber 这边还没有形成最终结论，下一步优先验证：

- 把 `x-client-id` 改成 DefiLlama 抓到的值再测一轮
- 如果还要继续验证网页链路，改用 `Playwright` 发起真实浏览器请求，绕过当前服务端脚本会碰到的 Cloudflare challenge

这两项现在都还是 `todo`，不应在文档里当作已验证结论。

## 压测脚本

仓库里新增了一个针对 DefiLlama 行为的压测脚本：

- [scripts/defillama-rate-test.js](/Users/xhan/Desktop/market_diff/scripts/defillama-rate-test.js)

对应的构造与统计工具：

- [scripts/defillama-rate-test-utils.js](/Users/xhan/Desktop/market_diff/scripts/defillama-rate-test-utils.js)

它的目标不是压全量聚合器，而是专门测试：

- `ParaSwap`
- `KyberSwap`
- 服务端直连链路

默认交易对是 Ethereum 上的 6 个方向：

- `cbBTC -> WBTC`
- `WBTC -> cbBTC`
- `cbBTC -> USDC`
- `USDC -> cbBTC`
- `WBTC -> USDC`
- `USDC -> WBTC`

脚本会尽量模拟 DefiLlama 网页请求：

- 直连 `apiv5.paraswap.io` 或 `aggregator-api.kyberswap.com`
- 会带上 `user-agent`、`accept`、`origin`、`referer`
- Kyber 直连时会带 `x-client-id: llamaswap`
- ParaSwap 直连时会带 `partner=llamaswap`

注意：

- 这个脚本是服务端脚本，不是浏览器自动化。
- `hide-ip=on` 的服务端实现已经移除，因为实测只会稳定撞上 Cloudflare challenge `403`。
- 如果要继续测 `Hide IP`，应单独做浏览器自动化版脚本。

常用参数：

- `--cnt`
- `-cnt`
- `--interval-ms`
- `--timeout-ms`
- `--provider paraswap|kyberswap|all`

示例：

```bash
node scripts/defillama-rate-test.js --cnt 60 --interval-ms 300 --provider paraswap
node scripts/defillama-rate-test.js -cnt 60 --interval-ms 300 --provider kyberswap
node scripts/defillama-rate-test.js --cnt 120 --interval-ms 200 --provider all
```