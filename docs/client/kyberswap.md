# KyberSwap Web API 说明

基于对页面 `https://kyberswap.com/swap/ethereum/gho-to-usdc` 的实际抓包整理，时间为 2026-03-08。

## 结论

- KyberSwap 这个页面的核心报价接口是：

```text
GET https://aggregator-api.kyberswap.com/{chain}/api/v1/routes
```

- 以页面里的 `GHO -> USDC` 为例，实际请求如下：

```text
https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f&tokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amountIn=1000000000000000000&gasInclude=true
```

- 报价接口不需要登录态，也不需要 `Authorization`。
- 浏览器请求里会带 `x-client-id: kyberswap`，但它不是鉴权字段。
- 接口前面有 Cloudflare/WAF，正常浏览器请求和普通 `curl` 可用，但如果把 `User-Agent` 清空，可能会触发 `403 challenge`。

## 参数说明

- `chain`: 链标识，页面示例里是 `ethereum`。
- `tokenIn`: 输入代币地址。
- `tokenOut`: 输出代币地址。
- `amountIn`: 输入数量，使用最小单位整数。
- `gasInclude`: 是否把 gas 影响计入路由报价，页面里抓到的是 `true`。

## 关键返回字段

成功响应里常用字段：

- `data.routeSummary.amountIn`
- `data.routeSummary.amountOut`
- `data.routeSummary.amountInUsd`
- `data.routeSummary.gas`
- `data.routeSummary.gasPrice`
- `data.routeSummary.gasUsd`
- `data.routeSummary.route`
- `data.routeSummary.routeID`
- `data.routeSummary.checksum`
- `data.routeSummary.timestamp`
- `data.routerAddress`

`routeSummary.route` 会给出具体拆单路径、池子、交易所来源和每跳数量变化。

## 鉴权与限制

### 不需要的东西

- 不需要登录
- 不需要 cookie
- 不需要 `Authorization: Bearer ...`

### 抓包 header 逐条解释

下面按你抓到的 header 逐条说明，重点是哪些通常会自动生成。

#### `:authority`

- 作用：HTTP/2 里的目标主机，等价于 HTTP/1.1 的 `Host`。
- 是否自动生成：是。
- 说明：你传入完整 URL 后，请求库会自动生成，不用手写。

#### `:method`

- 作用：HTTP 方法，这里是 `GET`。
- 是否自动生成：通常是。
- 说明：你在 `fetch`、`axios`、`curl` 里指定 `GET` 后，请求库会转换成这个伪头。

#### `:path`

- 作用：请求路径加查询串，也就是：

```text
/ethereum/api/v1/routes?tokenIn=...&tokenOut=...&amountIn=...&gasInclude=true
```

- 是否自动生成：是。
- 说明：你把完整 URL 传进去后会自动生成，不用单独写。

#### `:scheme`

- 作用：协议，这里是 `https`。
- 是否自动生成：是。
- 说明：由 URL 自动决定，不用手写。

#### `accept`

- 作用：告诉服务端客户端能接受什么响应类型。`*/*` 表示都能接收。
- 是否自动生成：
  - 浏览器：通常会自动带。
  - `fetch` / `axios` / `curl`：很多时候会自动带，或即使不带也能工作。
- 说明：通常不是必须手写。

#### `accept-encoding`

- 作用：告诉服务端客户端支持哪些压缩格式，比如 `gzip`、`br`、`zstd`。
- 是否自动生成：
  - 浏览器：会自动带。
  - `curl`：不一定总是完整自动带，和版本、参数有关。
  - Node.js：不同实现不完全一样。
- 说明：一般不需要你主动设置，除非你想尽量模拟浏览器。

#### `accept-language`

- 作用：告诉服务端客户端偏好的语言。
- 是否自动生成：
  - 浏览器：通常会自动带。
  - 服务端脚本：通常不会自动带。
- 说明：对这个报价接口通常不是必要参数。

#### `origin`

- 作用：表示请求是从哪个源发起的，这里是 `https://kyberswap.com`。
- 是否自动生成：
  - 浏览器：跨站请求时通常会自动带。
  - 服务端脚本：不会自动带，除非你手动加。
- 说明：这不是自定义 header，是标准 header。对这个接口不是硬要求，但浏览器环境里常见。

#### `priority`

- 作用：浏览器对请求优先级的提示。
- 是否自动生成：
  - 浏览器：可能自动带。
  - 服务端脚本：通常不会自动带。
- 说明：这不是你业务上要关心的参数，通常不用手动写。

#### `referer`

- 作用：告诉服务端当前请求是从哪个页面跳过来的，这里是 `https://kyberswap.com/`。
- 是否自动生成：
  - 浏览器：通常会自动带，受 `Referrer-Policy` 影响。
  - 服务端脚本：不会自动带，除非你手动加。
- 说明：不是硬要求，但很多网页请求会自然带上。

#### `sec-ch-ua`

- 作用：浏览器客户端标识，属于 Client Hints。
- 是否自动生成：
  - 浏览器：会自动带。
  - 服务端脚本：不会自动带。
- 说明：标准浏览器头，不是自定义 header。

#### `sec-ch-ua-mobile`

- 作用：表示是否是移动端。
- 是否自动生成：
  - 浏览器：会自动带。
  - 服务端脚本：不会自动带。
- 说明：标准浏览器头，不是自定义 header。

#### `sec-ch-ua-platform`

- 作用：表示客户端平台，这里是 `macOS`。
- 是否自动生成：
  - 浏览器：会自动带。
  - 服务端脚本：不会自动带。
- 说明：标准浏览器头，不是自定义 header。

#### `sec-fetch-dest`

- 作用：说明请求目标类型，这里是 `empty`，表示普通 `fetch/xhr`。
- 是否自动生成：
  - 浏览器：会自动带。
  - 服务端脚本：不会自动带。
- 说明：标准浏览器头，不是自定义 header。

#### `sec-fetch-mode`

- 作用：说明请求模式，这里是 `cors`。
- 是否自动生成：
  - 浏览器：会自动带。
  - 服务端脚本：不会自动带。
- 说明：标准浏览器头，不是自定义 header。

#### `sec-fetch-site`

- 作用：说明请求和目标站点的关系，这里是 `same-site`。
- 是否自动生成：
  - 浏览器：会自动带。
  - 服务端脚本：不会自动带。
- 说明：标准浏览器头，不是自定义 header。

#### `user-agent`

- 作用：客户端身份标识。
- 是否自动生成：
  - 浏览器：会自动带。
  - `curl`：会自动带自己的 `curl/...`
  - Node.js / Python：是否自动带、带什么值，取决于库。
- 说明：不是自定义 header。这个接口里它比较重要，我实测把 `User-Agent` 清空后会触发 Cloudflare challenge，返回 `403`。

#### `x-client-id`

- 作用：前端自定义标识，用来告诉后端“请求来自 kyberswap 前端”。
- 是否自动生成：不会。
- 说明：这是自定义 header。浏览器不会自己生成，只有前端代码显式设置才会带。

#### 总结

通常会自动生成的，主要是：

- HTTP/2 伪头：`:authority`、`:method`、`:path`、`:scheme`
- 浏览器环境头：`accept`、`accept-language`、`origin`、`referer`、`sec-*`、`priority`、`user-agent`

通常不会自动生成、需要代码显式设置的，主要是：

- `x-client-id`

如果你是服务端脚本发请求，最常见的实际情况是：

- URL、方法会自动转成 `:method`、`:path` 等，不用你管
- `User-Agent` 最好手动给一个正常值
- `x-client-id` 要不要带，取决于你是否想尽量贴近网页请求
- `origin`、`referer`、`sec-*` 一般都不是必须

### 响应头特征

实测响应里有这些头：

```text
x-tier: basic
x-ratelimit-limit: 30, 10
x-ratelimit-remaining: 29
x-ratelimit-reset-after: 10
```

说明这是公开接口，但有限流。

另外：

- `GET` 正常返回 `200`
- `HEAD` 实测会返回 `404`
- 带 `Origin` 请求时，服务端会回 `access-control-allow-origin`

## 服务端限流实测（2026-07-24）

测试使用同一个 Ethereum `cbBTC -> WBTC` 报价 URL、同一出口 IP，每个
`X-Client-Id` 只请求一次。实际响应如下：

| X-Client-Id | 状态 | x-ratelimit-limit | x-ratelimit-remaining | x-ratelimit-reset-after |
| --- | ---: | ---: | ---: | ---: |
| `kingswap-trade-bot` | 200 | `100, 10` | 99 | 10 |
| `kingswap-quote-dashboard` | 200 | `100, 10` | 98 | 10 |
| `xh-chain-baby` | 200 | `60, 10` | 59 | 10 |
| `xh-chain-trade` | 200 | `100, 10` | 97 | 10 |

观察：

- `X-Client-Id` 会影响服务端给出的限流档位；随机 ID `swap-hero-0927` 返回的是
  `30, 10`，上表分别是 `60, 10` 或 `100, 10`。
- 三个 `100, 10` 的不同 ID 按请求顺序得到剩余值 `99 -> 98 -> 97`，说明它们在本次
  同一出口 IP 测试中没有获得独立的 100 次额度。
- `x-ratelimit-reset-after: 10` 始终为 10，表示 10 秒限流窗口，不是实时倒计时。
- 仅凭这次单出口测试，无法确认不同出口 IP 是否能叠加额度。

本次单次请求的等价 `curl` 如下。`-D -` 会把响应头输出到终端，`-o /dev/null` 丢弃响应体：

```bash
curl -sS -D - -o /dev/null \
  -A 'market-diff-header-check/1.0' \
  -H 'X-Client-Id: kingswap-quote-dashboard' \
  'https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf&tokenOut=0x2260fac5e5542a773aa44fbcfedf7c193bc2c599&amountIn=100000000'
```

把 `X-Client-Id` 的值替换为表中的其他 ID，即可复现对应的单次检查。

### 4 QPS 随机 ID 压测

使用 `X-Client-Id: swap-hero-0927` 对同一 URL 按定时并发 `4 QPS` 发起请求。首个
`429` 是第 36 个请求，响应时约在第 9.16 秒；最终收到 35 个 `200` 和 2 个 `429`
（第 37 个请求在首个 429 返回前已发出）。

首个 `429` 的关键响应头：

```text
x-tier: basic
x-ratelimit-limit: 30, 10
x-ratelimit-remaining: 0
x-ratelimit-reset-after: 10
```

因此，`basic` 档应按每 10 秒 30 次，即稳定不超过 `3 QPS` 使用。并发请求时，成功响应
中的 `x-ratelimit-remaining` 会因在途请求和响应返回顺序而跳变，不能把单条值当作严格计数器。

## 最小可用调用

### curl

```bash
curl 'https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f&tokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amountIn=1000000000000000000&gasInclude=true'
```

更稳一点可以显式带一个常规 `User-Agent`。这也是服务端脚本里最推荐的最小写法：

```bash
curl \
  -H 'User-Agent: Mozilla/5.0' \
  'https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f&tokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amountIn=1000000000000000000&gasInclude=true'
```

### curl 保守复刻版

```bash
curl 'https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f&tokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amountIn=1000000000000000000&gasInclude=true' \
  -H 'accept: */*' \
  -H 'accept-encoding: gzip, deflate, br, zstd' \
  -H 'accept-language: zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7' \
  -H 'origin: https://kyberswap.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://kyberswap.com/' \
  -H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' \
  -H 'x-client-id: kyberswap'
```

### Node.js

```js
const url = new URL("https://aggregator-api.kyberswap.com/ethereum/api/v1/routes");
url.searchParams.set("tokenIn", "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f");
url.searchParams.set("tokenOut", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
url.searchParams.set("amountIn", "1000000000000000000");
url.searchParams.set("gasInclude", "true");

const resp = await fetch(url, {
  headers: {
    "user-agent": "Mozilla/5.0",
  },
});

if (!resp.ok) {
  throw new Error(`kyber route failed: ${resp.status}`);
}

const data = await resp.json();
console.log(data.data.routeSummary.amountOut);
console.log(data.data.routeSummary.routeID);
console.log(data.data.routerAddress);
```

### Node.js 保守复刻版

```js
const url = new URL("https://aggregator-api.kyberswap.com/ethereum/api/v1/routes");
url.searchParams.set("tokenIn", "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f");
url.searchParams.set("tokenOut", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
url.searchParams.set("amountIn", "1000000000000000000");
url.searchParams.set("gasInclude", "true");

const resp = await fetch(url, {
  method: "GET",
  headers: {
    accept: "*/*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7",
    origin: "https://kyberswap.com",
    priority: "u=1, i",
    referer: "https://kyberswap.com/",
    "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "x-client-id": "kyberswap",
  },
});

if (!resp.ok) {
  throw new Error(`kyber route failed: ${resp.status}`);
}

const data = await resp.json();
console.log(data.data.routeSummary.amountOut);
```

### 浏览器 fetch

浏览器里通常不需要手动设置 `origin`、`referer`、`sec-*`、`user-agent`，浏览器会自己处理：

```js
const url = new URL("https://aggregator-api.kyberswap.com/ethereum/api/v1/routes");
url.searchParams.set("tokenIn", "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f");
url.searchParams.set("tokenOut", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
url.searchParams.set("amountIn", "1000000000000000000");
url.searchParams.set("gasInclude", "true");

const resp = await fetch(url, { method: "GET" });
const data = await resp.json();
console.log(data.data.routeSummary.amountOut);
```

## 当前页面示例

- 页面：`https://kyberswap.com/swap/ethereum/gho-to-usdc`
- `GHO`: `0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f`
- `USDC`: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- 示例输入：`1 GHO = 1000000000000000000`

## 与当前项目源码的对比

当前仓库源码里没有直接调用 Kyber/KyberSwap API。

项目当前主要使用的是：

- Arbitrum RPC
- The Graph 的 subgraph GraphQL API

也就是说，当前项目拿价格和持仓数据的方式，与 Kyber 这个网页的聚合报价接口不是一套东西。

当前项目源码里能看到的对外调用模式：

- `web/wbtc-cbbtc-arb-dashboard/src/arbLpService.js`
  - 通过 `JsonRpcProvider(config.rpc.arbUrl)` 连 Arbitrum RPC
  - 通过 `POST this.config.graph.subgraphUrl` 拉 The Graph 数据
  - 如果配置了 `ApiKey`，会带 `Authorization: Bearer ...`
- `web/wbtc-cbbtc-arb-dashboard/config.json`
  - RPC: `https://arb1.arbitrum.io/rpc`
  - Graph: `https://gateway.thegraph.com/api/subgraphs/id/...`
- `get_pool_price_wbtc_cbbtc_arb.js`
  - 直接读取链上池子 `slot0()` 算价格
- `get_lp_detail_wbtc_cbbtc_arb.py`
  - 直接走 RPC + The Graph

简化对比：

- Kyber 网页报价接口：公开 GET，基本不需要鉴权，但有 WAF 和限流
- 当前项目：RPC + The Graph，Graph 这边带 Bearer API Key


# raw headers  
一行 header , 一行 value

:authority
aggregator-api.kyberswap.com
:method
GET
:path
/ethereum/api/v1/routes?tokenIn=0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f&tokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amountIn=2000000000000000000&gasInclude=true
:scheme
https
accept
*/*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7
origin
https://kyberswap.com
priority
u=1, i
referer
https://kyberswap.com/
sec-ch-ua
"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"macOS"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
same-site
user-agent
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36
x-client-id
kyberswap
