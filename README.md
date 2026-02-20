# streaming-markdown monorepo

本仓库采用 monorepo 结构。

> [English Version](./README_EN.md)

## 目录说明

- `packages/streaming-markdown`：HarmonyOS 流式 Markdown 库（`@ycj3/streaming-markdown`）
- `apps/quickstart-harmony`：可运行的 HarmonyOS 快速示例（含 Gemini relay 后端）
- `tools/scripts`：工作区脚本

## 常用命令

- 运行库测试：

```bash
cd packages/streaming-markdown
bash scripts/run-tests.sh
```

- 启动 quickstart 后端：

```bash
cd apps/quickstart-harmony/backend
npm install
export GEMINI_API_KEY="<你的 key>"
npm run dev
```

- 工作区测试快捷命令：

```bash
bash tools/scripts/test-all.sh
```
