# Solana Client 记录

## 当前接入

### Jupiter 报价

- 当前报价源是 `Jupiter`
- 代码位置：[src/market-clients/providers/jupiter.js](/Users/xhan/Desktop/market_diff/src/market-clients/providers/jupiter.js)
- 当前使用的报价接口：

```text
GET https://api.jup.ag/swap/v1/quote
```

当前请求参数：

- `inputMint`
- `outputMint`
- `amount`
- header: `x-api-key`

说明：

- 现在已经迁移到新版 `api.jup.ag`
- `Jupiter API Key` 通过 [config/config_more.json](/Users/xhan/Desktop/market_diff/config/config_more.json) 中的 `jupiterApiKey` 提供

### Helius 元数据

- Solana token metadata 走 `Helius RPC`
- 代码位置：[src/market-clients/index.js:131](/Users/xhan/Desktop/market_diff/src/market-clients/index.js#L131)
- RPC 配置位置：[src/server/server-app.js](/Users/xhan/Desktop/market_diff/src/server/server-app.js)
- 当前调用方法：

```text
POST https://mainnet.helius-rpc.com/?api-key=...
jsonrpc method: getAsset
```

说明：

- `getAsset` 属于 `DAS API`
- 这部分限额和普通 RPC 是分开的

## 官方 Rate Limit

### Jupiter

官方文档：

- [Jupiter Rate Limit](https://dev.jup.ag/portal/rate-limit)
- [Migrate from Lite API](https://dev.jup.ag/portal/migrate-from-lite-api)

当前需要关注的点：

- 免费档：`60 requests/minute`
- `swap/v1/quote` 走 `Default Bucket`
- 官方建议从 `lite-api.jup.ag` 迁移到 `api.jup.ag`
- 新版接口需要 `x-api-key`

### Helius

官方文档：

- [Helius Rate Limits](https://www.helius.dev/docs/billing/rate-limits)
- [Helius RPC FAQ](https://www.helius.dev/docs/faqs/rpc)

当前需要关注的点：

- `RPC` 和 `DAS & Enhanced APIs` 分开计费、分开限流
- `getAsset` 属于 `DAS API`
- 官方基础限流：
  - Free: `RPC 10 req/s`，`DAS 2 req/s`
  - Developer: `RPC 50 req/s`，`DAS 10 req/s`
  - Business: `RPC 200 req/s`，`DAS 50 req/s`
  - Professional: `RPC 500 req/s`，`DAS 100 req/s`

## TODO

- 继续观察新版 Jupiter 接口的 rate limit、返回结构和错误码是否有额外变化
- 迁移后补一轮 Solana 报价压测，确认当前 `apiIntervals.solana` 是否还合适
