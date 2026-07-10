# Issue tracker: Local Markdown

本仓库不使用 GitHub Issues。任务和 PRD 存放在 `.scratch/`。

- 每个需求一个目录：`.scratch/<feature-slug>/`
- PRD：`.scratch/<feature-slug>/PRD.md`
- 子任务：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- 文件顶部使用 `Status:` 记录 triage 状态
- 讨论记录追加到 `## Comments`
- skill 要求发布任务时，创建对应 Markdown 文件
- skill 要求读取 ticket 时，读取用户指定的文件路径
