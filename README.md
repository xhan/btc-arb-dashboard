# Market Diff

本项目是本地报价看板，后端入口是 `server.js`，前端页面由 `public/index.html` 和 `src/app/dashboard-app.js` 相关模块组成。

## 启动看板

```bash
npm install
npm start
```

默认访问：

```text
http://127.0.0.1:3000
```

## Llama-ParaSwap Browser Proxy

Llama-ParaSwap 是本项目给 “DefiLlama Hide IP + ParaSwap 报价” 这条链路起的名字。它需要走真实 Chrome 页面环境，不能直接由 Node 服务端稳定请求 `swap-api.defillama.com`。项目里提供了本地 proxy daemon，供看板后端调用。

启动 daemon：

```bash
npm run defillama:proxy
```

默认行为：

- 监听 `http://127.0.0.1:18081`
- 打开普通 Chrome 窗口，通过 CDP 执行页面内 `fetch`
- 提供 `GET /health` 和 `POST /quote`
- 不控制请求间隔，请求频率由看板队列控制

健康检查：

```bash
curl http://127.0.0.1:18081/health
```

常用参数：

```bash
npm run defillama:proxy -- --port 18082 --timeout-ms 10000
```

不建议默认使用 headless；实测 headless 更容易触发 `Failed to fetch`。如需临时测试：

```bash
npm run defillama:proxy -- --headless true --verbose true
```

## 看板里怎么配置

在交易对设置弹窗里：

- `数据源偏好` 选择 `Llama-ParaSwap`
- 全局设置里可以调整 `Llama-ParaSwap (默认 800ms)` 的队列间隔

默认 proxy 配置在 `config/config_more.json` 的 `providerSettings` 里：

```json
{
  "providerSettings": {
    "llamaParaSwapProxyUrl": "http://127.0.0.1:18081",
    "llamaParaSwapSlippage": "0.5"
  }
}
```

如果要给不同请求通道使用不同 daemon，在 `config/request_channels.json` 的通道里配置：

```json
{
  "channels": [
    {
      "id": "hk-1",
      "name": "HK-1",
      "intervals": {
        "llamaparaswap": 800
      },
      "providerSettings": {
        "llamaParaSwapProxyUrl": "http://127.0.0.1:18082"
      }
    }
  ]
}
```
```bash
# 压测
npm run defillama:browser-rate -- --interval-ms 800 --duration-min 30
```
更详细的 DefiLlama 抓包、压测和 daemon 说明见 `docs/client/defillama.md`。
