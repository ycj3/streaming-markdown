# @ycj3/streaming-markdown

HarmonyOS ArkTS 流式 Markdown 渲染器。

> [English Version](./README_EN.md)

## 安装

### 方式一：ohpm install（推荐）

```bash
ohpm install @ycj3/streaming-markdown
```

### 方式二：本地 file 依赖（开发调试）

在你的 `entry/oh-package.json5` 中添加：

```json5
{
  dependencies: {
    "@ycj3/streaming-markdown": "file:../../../packages/streaming-markdown",
  },
}
```

在你的 `build-profile.json5` 中添加模块声明：

```json5
{
  modules: [
    { name: "entry", srcPath: "./entry" },
    {
      name: "streaming_markdown",
      srcPath: "../../packages/streaming-markdown",
    },
  ],
}
```

## 快速开始

- 快速开始入口：[quickstart-harmony](https://github.com/ycj3/streaming-markdown/tree/main/apps/quickstart-harmony)
- 建议直接运行该工程，体验：
  - AI 真流渲染
  - Preset 样式切换（含浅色/深色）
  - `StreamingMarkdownConfig` 分组配置效果

## API

### `MarkdownStream`

```ts
new MarkdownStream(options?)
stream.append(chunk: string)
stream.finish()
stream.pause()
stream.resume()
stream.reset()
stream.subscribe(listener)
stream.onComplete(listener)
```

### `StreamingMarkdown`

```ts
StreamingMarkdown({
  stream: MarkdownStream,
  config?: StreamingMarkdownConfig,
  onComplete?: () => void
})
```

其中 `config` 按 Markdown 功能分组配置样式（如 `heading`、`paragraph`、`blockquote`、`list`、`codeBlock`、`table`、`horizontalRule`、`inline`、`layout`）。

#### `StreamingMarkdownConfig` API Reference

```ts
interface StreamingMarkdownConfig {
  heading?: {
    sizes?: number[];
    color?: string;
    topSpacing?: number;
    bottomSpacing?: number;
  };
  paragraph?: {
    fontSize?: number;
    lineHeight?: number;
    fontFamily?: string;
    color?: string;
    secondaryColor?: string;
    bottomSpacing?: number;
  };
  list?: {
    fontSize?: number;
    lineHeight?: number;
    color?: string;
    itemBottomSpacing?: number;
  };
  blockquote?: {
    textColor?: string;
    bgColor?: string;
    borderColor?: string;
    bottomSpacing?: number;
  };
  codeBlock?: {
    borderColor?: string;
    radius?: number;
    topSpacing?: number;
    bottomSpacing?: number;
  };
  table?: {
    headerBgColor?: string;
    borderColor?: string;
    stripeBgColor?: string;
    cellFontSize?: number;
    topSpacing?: number;
    bottomSpacing?: number;
  };
  horizontalRule?: {
    color?: string;
    topSpacing?: number;
    bottomSpacing?: number;
  };
  inline?: {
    linkColor?: string;
    codeTextColor?: string;
    codeBgColor?: string;
    mathTextColor?: string;
    mathBgColor?: string;
    monoFontFamily?: string;
  };
  layout?: {
    contentPadding?: {
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
    };
    fontFamily?: string;
  };
}
```

按 Markdown 功能分组说明如下。

**Feature: Heading（标题）**

| 字段            | 类型       | 默认值                  | 说明                                       |
| --------------- | ---------- | ----------------------- | ------------------------------------------ |
| `sizes`         | `number[]` | `[0,28,24,20,18,16,14]` | 标题字号映射（`index=1..6` 对应 `H1..H6`） |
| `color`         | `string`   | `'#1A1A1A'`             | 标题文字颜色                               |
| `topSpacing`    | `number`   | `12`                    | 标题上间距                                 |
| `bottomSpacing` | `number`   | `8`                     | 标题下间距                                 |

**Feature: Paragraph（段落）**

| 字段             | 类型     | 默认值         | 说明                           |
| ---------------- | -------- | -------------- | ------------------------------ |
| `fontSize`       | `number` | `16`           | 段落字号                       |
| `lineHeight`     | `number` | `24`           | 段落行高（也作为列表默认行高） |
| `fontFamily`     | `string` | `'sans-serif'` | 正文字体                       |
| `color`          | `string` | `'#333333'`    | 正文文字颜色                   |
| `secondaryColor` | `string` | `'#666666'`    | 次级文字色 token               |
| `bottomSpacing`  | `number` | `8`            | 段落下间距                     |

**Feature: List（列表）**

| 字段                | 类型     | 默认值                      | 说明         |
| ------------------- | -------- | --------------------------- | ------------ |
| `fontSize`          | `number` | 跟随 `paragraph.fontSize`   | 列表项字号   |
| `lineHeight`        | `number` | 跟随 `paragraph.lineHeight` | 列表项行高   |
| `color`             | `string` | 跟随 `paragraph.color`      | 列表文字颜色 |
| `itemBottomSpacing` | `number` | `4`                         | 列表项下间距 |

**Feature: Blockquote（引用）**

| 字段            | 类型     | 默认值      | 说明           |
| --------------- | -------- | ----------- | -------------- |
| `textColor`     | `string` | `'#666666'` | 引用文字颜色   |
| `bgColor`       | `string` | `'#F9F9F9'` | 引用背景色     |
| `borderColor`   | `string` | `'#E0E0E0'` | 引用左边框颜色 |
| `bottomSpacing` | `number` | `8`         | 引用块下间距   |

**Feature: Code Block（代码块）**

| 字段            | 类型     | 默认值      | 说明         |
| --------------- | -------- | ----------- | ------------ |
| `borderColor`   | `string` | `'#E5E5E5'` | 代码块边框色 |
| `radius`        | `number` | `12`        | 代码块圆角   |
| `topSpacing`    | `number` | `16`        | 代码块上间距 |
| `bottomSpacing` | `number` | `16`        | 代码块下间距 |

**Feature: Table（表格）**

| 字段            | 类型     | 默认值      | 说明             |
| --------------- | -------- | ----------- | ---------------- |
| `headerBgColor` | `string` | `'#F5F5F5'` | 表头背景色       |
| `borderColor`   | `string` | `'#E0E0E0'` | 表格边框色       |
| `stripeBgColor` | `string` | `'#FAFAFA'` | 表格斑马纹背景色 |
| `cellFontSize`  | `number` | `14`        | 表格单元格字号   |
| `topSpacing`    | `number` | `12`        | 表格上间距       |
| `bottomSpacing` | `number` | `12`        | 表格下间距       |

**Feature: Horizontal Rule（分割线）**

| 字段            | 类型     | 默认值      | 说明         |
| --------------- | -------- | ----------- | ------------ |
| `color`         | `string` | `'#E0E0E0'` | 分割线颜色   |
| `topSpacing`    | `number` | `16`        | 分割线上间距 |
| `bottomSpacing` | `number` | `16`        | 分割线下间距 |

**Feature: Inline（行内元素）**

| 字段             | 类型     | 默认值        | 说明              |
| ---------------- | -------- | ------------- | ----------------- |
| `linkColor`      | `string` | `'#1976D2'`   | 链接颜色          |
| `codeTextColor`  | `string` | `'#D32F2F'`   | 行内代码文字色    |
| `codeBgColor`    | `string` | `'#F5F5F5'`   | 行内代码背景色    |
| `mathTextColor`  | `string` | `'#0D47A1'`   | 行内数学文字色    |
| `mathBgColor`    | `string` | `'#EEF3FF'`   | 行内数学背景色    |
| `monoFontFamily` | `string` | `'monospace'` | 行内代码/数学字体 |

**Feature: Layout（整体布局）**

| 字段                    | 类型     | 默认值 | 说明                                                   |
| ----------------------- | -------- | ------ | ------------------------------------------------------ |
| `contentPadding.left`   | `number` | `0`    | 内容左内边距                                           |
| `contentPadding.right`  | `number` | `0`    | 内容右内边距                                           |
| `contentPadding.top`    | `number` | `0`    | 内容上内边距                                           |
| `contentPadding.bottom` | `number` | `0`    | 内容下内边距                                           |
| `fontFamily`            | `string` | `'-'`  | 全局字体兜底（当 `paragraph.fontFamily` 未设置时生效） |

**Feature: Compatibility（兼容约定）**

`heading.sizes` 兼容两种写法：

- `length=7`：按 `[0,h1,h2,h3,h4,h5,h6]` 读取；
- `length=6`：按 `[h1,h2,h3,h4,h5,h6]` 读取。

## 环境要求

- HarmonyOS API 6.0.1+
- DevEco Studio 4.0+

## 许可证

Apache-2.0
