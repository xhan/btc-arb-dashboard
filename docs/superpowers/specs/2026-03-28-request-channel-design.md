# 请求通道（多出口）设计文档

## 背景

当前看板的请求队列按数据源拆分，但同一数据源下的所有交易对仍共享同一个请求节奏和同一套 API 配置。对于时效性要求较高的场景，这会导致两个问题：

1. 同一数据源下的 task 会堆积在一个队列里，拉长整轮刷新周期。
2. 同一套 API key / 同一出口会共享上游限流，无法横向扩容。

本设计引入“请求通道”概念：在保持现有数据源偏好逻辑不变的前提下，为请求增加一层独立的网络出口和增量配置覆盖。

## 目标

- 允许为单个交易对选择请求通道。
- 每个请求通道拥有自己的 HTTP 代理和自己的请求间隔。
- 请求通道缺省配置回退到当前默认配置，不要求复制整份配置。
- 通过将同一 source 的 task 分散到多个并行队列，缩短主看板全量报价一轮的周期。
- `queue-stats` 能显示真实运行中的“source + channel”队列。

## 非目标

- 第一版不做请求通道管理 UI。
- 第一版不改 CEX 路径，`Bybit / Binance` 固定走默认通道。
- 第一版不改套利路径详情，详情请求固定走默认通道。
- 第一版不支持 `Cetus / Sui` 多通道。

## 名词

- 数据源偏好：`Kyber / 0x / Velora / LI.FI / ...`
- 请求通道：请求真正发出时使用的网络出口和增量配置，默认通道记为 `default`

## 配置模型

### 1. 交易对配置

在 `config.json` 的 quote 上新增可选字段：

```json
{
  "id": 123,
  "chain": "ethereum",
  "fromToken": "0x...",
  "toToken": "0x...",
  "preferredSource": "Kyber",
  "requestChannelId": "hk-1"
}
```

- 省略 `requestChannelId` 等价于 `default`
- 默认通道不强制落盘，只有非默认通道才写入

### 2. 新增通道配置文件

新增 `request_channels.json`，支持 `REQUEST_CHANNELS_PATH` 环境变量覆盖：

```json
{
  "channels": [
    {
      "id": "hk-1",
      "name": "HK-1",
      "httpProxy": "http://127.0.0.1:18001",
      "intervals": {
        "kyber": 120,
        "zerox": 90,
        "velora": 150,
        "lifi": 150,
        "solana": 2500,
        "starknet": 900
      },
      "configMore": {
        "kyberClientId": "your-client-id",
        "LIFIApiKey": "your-lifi-api-key",
        "jupiterApiKey": "your-jupiter-api-key",
        "veloraPartner": "your-partner"
      }
    }
  ]
}
```

- `httpProxy` 为该通道最重要的配置
- `intervals.*` 缺失时回退默认通道的 `config.json.settings`
- `configMore.*` 缺失时回退默认 `config_more.json`

## 作用范围

### 支持多通道的 source

- `kyber`
- `zerox`
- `velora`
- `lifi`
- `solana`（Jupiter）
- `starknet`（Ekubo）

### 强制默认通道的 source

- `sui`（Cetus）
- `bybit`
- `binance`

## 为什么第一版跳过 Cetus

`@cetusprotocol/aggregator-sdk` 当前不适合作为“每个请求通道独立代理”的第一版落点：

1. `AggregatorClientParams` 没有公开 `proxy / agent / fetch` 注入位。
2. SDK 内部 quote 请求直接调用裸 `fetch(...)`，没有向外暴露每请求 transport 覆盖。
3. `SuiHTTPTransport` 虽支持自定义 `fetch`，但这只覆盖 `SuiClient` 层，不能稳定接管 `AggregatorClient` 的完整 quote 链路。

如果第一版强行支持 Cetus，需要全局重写 `fetch` 或侵入 SDK 内部实现，风险高、边界不清，也会显著扩大改动面。因此 v1 明确将 `Sui / Cetus` 固定为默认通道。

## 队列设计

### 现状

当前主看板按 source 维护固定队列，例如：

- `kyber`
- `zerox`
- `velora`
- `lifi`
- `bybit`
- `binance`
- `solana`
- `sui`
- `starknet`

同一 source 下的所有 quote task 都进入同一个队列。

### 新设计

将支持多通道的 DEX 队列拆成：

- `source × requestChannelId`

例如：

- `kyber:default`
- `kyber:hk-1`
- `kyber:us-2`
- `solana:default`
- `solana:sg-1`

每个队列都有自己的：

- task 列表
- 当前索引
- timer
- 请求间隔

`bybit / binance / sui` 仍保持单队列，不参与通道拆分。

### 为什么它能缩短整轮周期

旧模型中，同一 source 的一轮名义周期约为：

`taskCount(source) × interval(source)`

新模型中，周期变为：

`taskCount(source, channel) × interval(source, channel)`

因为不同队列并行运行，只要将重负载 source 下的 quote 分散到多个通道，就能降低单队列 task 数，缩短最慢队列的一轮时间。

例子：

- 旧：`kyber` 有 30 个 task，`170ms` 间隔，约 `5100ms / 轮`
- 新：拆成 3 个通道，每个 10 个 task，仍是 `170ms`
- 则每个通道约 `1700ms / 轮`

因此，对绑定到这些通道里的 quote 而言，轮到自己的周期会明显缩短。

## 前端设计

### 1. 通道加载

`app.js` 初始化时新增读取：

- `GET /api/get-request-channels`

前端保存一份请求通道列表，用于：

- 弹窗下拉展示
- 队列选择
- interval 解析
- `queue-stats` 统计

### 2. 交易对设置弹窗

在现有报价设置弹窗新增“请求通道”下拉：

- EVM / Solana / Starknet 显示
- Sui / Bybit / Binance 隐藏或仅显示默认通道

切换保存后：

- 更新 quote 的 `requestChannelId`
- 重建该 quote 所属队列
- 触发一次刷新

### 3. 套利详情

套利路径详情继续使用默认通道：

- 不读取 quote 自身 `requestChannelId`
- 不参与多通道扩容

## 服务端设计

### 1. 新接口

新增：

- `GET /api/get-request-channels`

返回规范化后的请求通道信息，例如：

```json
{
  "channels": [
    {
      "id": "default",
      "name": "默认通道",
      "isDefault": true,
      "httpProxy": "",
      "intervals": {
        "kyber": 170,
        "zerox": 110
      }
    },
    {
      "id": "hk-1",
      "name": "HK-1",
      "isDefault": false,
      "httpProxy": "http://127.0.0.1:18001",
      "intervals": {
        "kyber": 120,
        "zerox": 90
      }
    }
  ]
}
```

### 2. 请求上下文

现有 DEX quote endpoint 接收 `requestChannelId` 后，服务端先构造有效请求上下文：

- `channelId`
- `channelName`
- `httpProxy`
- `effectiveConfigMore`

再传给对应 provider。

### 3. 代理支持

对于支持多通道的 provider：

- `Kyber`
- `0x`
- `Velora`
- `LI.FI`
- `Jupiter`
- `Ekubo`

统一使用请求上下文中的 `httpProxy` 创建 agent。

不支持多通道的 provider：

- `Cetus`
- `Bybit`
- `Binance`

忽略 `requestChannelId`，固定走默认通道。

## queue-stats 设计

统计页从“source 维度”升级为“真实队列维度”。

每行表示一个真实运行队列，最少展示：

- `Channel`
- `Source`
- `Interval`
- `Quote 数`
- `Main Task`
- `Inverse Task`
- `Task 总数`
- `名义一轮`

这样可以直接验证多通道拆分后，`taskCount` 和 `nominalLapMs` 是否真的下降。

## 测试策略

### 单元测试

- 请求通道配置解析
- channel 回退规则
- `source + channel` 队列 key 解析
- `queue-stats` 统计正确性

### 接口测试

- `GET /api/get-request-channels`
- 不同 `requestChannelId` 下 provider 使用正确代理和配置
- `Cetus / Bybit / Binance` 强制默认通道

### 前端行为测试

- 设置弹窗新增请求通道下拉
- `Sui` 不提供非默认通道
- 套利详情强制走默认通道

## 落地顺序

1. 写设计文档
2. 加请求通道共享工具与测试
3. 加后端请求通道配置和接口
4. 接入 provider 请求上下文
5. 接入前端弹窗、动态队列和 queue-stats
6. 跑相关测试并回归
