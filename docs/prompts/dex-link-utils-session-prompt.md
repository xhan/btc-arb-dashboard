# Dex Link 修改 Prompt

把这段直接发给别的 session：

```text
请先阅读并基于当前项目里的 dex url 共用实现做修改，不要重新发明一套。

核心函数在：
- /Users/xhan/Desktop/market_diff/src/ui/dex-link-utils.js

当前对外接口：
- buildDexLink(config)
- getDexLinkLabel(config)

config 结构：
- chain
- fromTokenAddress
- toTokenAddress
- inputAmount

当前规则：
- bybit / binance 返回 null
- sui -> cetus
- solana -> jup.ag
- starknet -> ekubo
- 其他默认走 swap.defillama

当前复用位置：
- /Users/xhan/Desktop/market_diff/src/arb/arb-detail-utils.js
- /Users/xhan/Desktop/market_diff/app.js

当前复制 dex url 的通用入口在：
- /Users/xhan/Desktop/market_diff/app.js
- 函数名：copyDexLinkFromElement(targetEl)

如果你要修改 dex url 生成逻辑，请优先改 /Users/xhan/Desktop/market_diff/src/ui/dex-link-utils.js，
然后检查以下使用方是否仍然兼容：
- 套利路径详情里的 dex 链接复制
- 数据终端里的 dex 链接复制

要求：
- 保持最小改动，不要过分设计
- 不要新增第二套 dex url builder
- 如果只是改某条链的 url 规则，只改共享 helper 和必要测试
- 如果需要改复制交互，尽量复用 copyDexLinkFromElement(targetEl)

相关测试：
- /Users/xhan/Desktop/market_diff/tests/dex-link-utils.test.js
- /Users/xhan/Desktop/market_diff/tests/arb-detail-utils.test.js
- /Users/xhan/Desktop/market_diff/tests/static-server.test.js

改完后至少运行：
- node tests/dex-link-utils.test.js
- node tests/arb-detail-utils.test.js
- node tests/static-server.test.js
```
