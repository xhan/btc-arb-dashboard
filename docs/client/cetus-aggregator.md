# Cetus Aggregator 说明

基于项目当前接入方式和 Cetus 官方文档整理，更新时间为 2026-03-31。

## 当前项目接入

- SDK 包名：`@cetusprotocol/aggregator-sdk`
- 当前版本：`1.4.4`
- 当前用途：只做 Sui 报价查询，调用 `findRouters()`
- 不使用 Cetus SDK 的交易构建能力，如 `fastRouterSwap()`、`routerSwap()`

服务端初始化位置：

- [src/server/server-app.js](/Users/xhan/Desktop/market_diff/src/server/server-app.js)

报价 provider 位置：

- [src/market-clients/providers/cetus.js](/Users/xhan/Desktop/market_diff/src/market-clients/providers/cetus.js)

## 当前默认行为

- 默认走 Cetus 官方推荐的 Aggregator V3 端点：

```text
https://api-sui.cetus.zone/router_v3/find_routes
```

- 如果没有额外配置，项目会直接使用上面的公共端点，不带 API key。

## 可选配置

可以在 `config/config_more.json` 里增加下面两个字段：

```json
{
  "cetusAggregatorEndpoint": "https://<YOUR_DOMAIN>/router_v3/find_routes",
  "cetusAggregatorApiKey": "<YOUR_API_KEY>"
}
```

说明：

- `cetusAggregatorEndpoint`
  - 可选
  - 默认值是官方公共 v3 端点
  - 如果 Cetus 提供了专属域名，就填这里
- `cetusAggregatorApiKey`
  - 可选
  - 默认空字符串
  - 如果 Cetus 提供了 API key，就填这里

## 限频说明

官方文档明确提到：

- 公共 Aggregator 有 `QPS limit`
- 可以通过“专属域名 + API key”提升额度

但官方文档没有公开写默认限频数值，也没有公开自助申请入口。

参考：

- [Getting started](https://cetus-1.gitbook.io/cetus-developer-docs/developer/cetus-aggregator/getting-started)
- [Prerequisites](https://cetus-1.gitbook.io/cetus-developer-docs/developer/cetus-aggregator/prerequisites)

## 申请方式

目前更稳妥的方式是直接联系 Cetus 团队申请：

- 邮箱：`hello@cetus.zone`
- Discord：<https://discord.gg/cetusprotocol>
- Telegram Dev Channel：<https://t.me/CetusDevNews>

## 迁移说明

这次升级对当前项目成本很低，原因是：

- 项目只用 `findRouters()` 报价
- 这部分在 Aggregator v2/v3 下入参结构兼容
- 当前项目不依赖返回里的详细路径结构

因此升级重点只有两件事：

- 升级 SDK 到 `1.4.4`
- 显式按对象方式初始化 `AggregatorClient`，固定使用 v3 配置
