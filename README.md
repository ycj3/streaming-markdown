# streaming-markdown

## 1. 简介

`streaming-markdown` 是一个面向 HarmonyOS 的流式 Markdown 渲染库（`@ycj3/streaming-markdown`），用于在 AI/LLM 输出场景下边接收边渲染，减少整段重刷和布局跳动。

仓库是 monorepo 结构：
- 核心库：`packages/streaming-markdown`
- 业务示例：`apps/quickstart-harmony`

## 2. 功能列表

支持的 Markdown 语法（当前实现）：

- 标题：`#` 到 `######`
- 段落：普通文本段落
- 引用：`> quote`
- 无序列表：`- item`
- 任务列表：`- [ ] todo` / `- [x] done`
- 有序列表：`1. item`
- 分割线：`---` / `***` / `___`
- 代码块：`\`\`\`lang ... \`\`\``
- 表格：`| h1 | h2 |`，支持对齐 `:---` / `:---:` / `---:`
- 行内粗体：`**bold**`
- 行内斜体：`*italic*`
- 行内粗斜体：`***bold italic***`
- 行内删除线：`~~del~~`
- 行内代码：`\`code\``
- 链接：`[text](url)`
- 行内数学公式：`$x^2$`
- 行间数学公式：`$$\frac{1}{2}$$`

流式能力：
- 通过 `MarkdownStream.append(chunk)` 持续推送增量内容
- 通过 `MarkdownStream.finish()` 标记流结束
- UI 使用 `StreamingMarkdown({ stream })` 自动增量更新

## 3. 安装

### 方式一：安装发布包（推荐）

```bash
ohpm install @ycj3/streaming-markdown
```

### 方式二：本地依赖（适合联调库源码）

在 `entry/oh-package.json5` 中添加：

```json5
{
  dependencies: {
    "@ycj3/streaming-markdown": "file:../../../packages/streaming-markdown",
  },
}
```

在 `build-profile.json5` 中添加模块声明：

```json5
{
  modules: [
    { name: "entry", srcPath: "./entry" },
    { name: "streaming_markdown", srcPath: "../../packages/streaming-markdown" },
  ],
}
```

## 4. 快速开始

- 快速开始入口：[quickstart-harmony](https://github.com/ycj3/streaming-markdown/tree/main/apps/quickstart-harmony)
- 建议直接运行该工程，体验：
  - AI 真流渲染
  - Preset 样式切换（含浅色/深色）
  - `StreamingMarkdownConfig` 分组配置效果
