# AGENTS.md

## 沟通与代码风格

- 使用中文沟通和编写项目文档。
- 代码保持简洁、可读，只添加必要注释。
- 优先复用现有模块，不引入重复实现或过度抽象。
- 修改范围应直接对应需求，不顺手重构无关代码。

## 项目结构

这是本地实时加密资产报价与套利看板。后端入口为 `server.js`，前端入口为
`public/index.html` 和 `src/app/dashboard-app.js`，采用原生 JavaScript 模块，无前端构建步骤。

主要边界：

- `src/quote/`：报价请求、状态、队列和 UI。
- `src/arb/`：套利发现、快照缓存、面板和详情。
- `src/alerts/`、`src/path-alerts/`：报警运行时、规则和屏蔽状态。
- `src/app/`：模块装配和跨领域协调。
- `src/server/`：Express 服务和 API。
- `config/`：报价、报警和请求通道配置。

## 修改约束

- 行情状态和纯 UI 状态必须分开，UI 变化不能推进市场 revision。
- 套利发现、面板更新和报警共享行情数据；修改其中一处时检查缓存失效、路径重算、UI 刷新和报警评估。
- 昂贵计算应按需执行：隐藏面板不重算，无报警任务不启动轮询。
- 配置保持单一来源，不在多个模块重复定义 token alias、chain label 或报警规则。
- 不引入 Vue 等框架重写现有前端，除非需求明确要求架构迁移。
- 本地配置改动默认不随代码提交，除非任务明确涉及配置。

## 验证

- 完整测试：`npm test`
- 测试文件位于 `tests/`，新增行为或修复必须补对应回归测试。
- 复杂 UI 调试使用 Playwright MCP，只打开一个前端页面。
- 调试页面保持多渠道关闭，完成后关闭页面，避免触发报价接口 QPS 限制。
- 启动服务前先确认端口和现有进程，避免重复运行看板。

## Agent skills

### Issue tracker

任务使用 `.scratch/<feature>/` 下的本地 Markdown 文件管理，不使用 GitHub Issues 或 PR 作为 triage 入口。见 `docs/agents/issue-tracker.md`。

### Triage labels

使用五个默认状态：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。见 `docs/agents/triage-labels.md`。

### Domain docs

使用 single-context 布局：根目录 `CONTEXT.md` 和 `docs/adr/`。见 `docs/agents/domain.md`。
