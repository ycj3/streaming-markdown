# @ycj3/streaming-markdown

HarmonyOS ArkTS 流式 Markdown 渲染器，专为实时 LLM 对话界面设计。

> [English Version](./README_EN.md)

---

## 功能特性

- **流式解析**: 字符级增量渲染，支持实时流式内容（如 LLM 输出）
- **块级架构**: 通过不可变 diff 实现高效更新，只重绘变化的部分
- **支持的 Markdown 语法**:
  - 标题 (`# H1` ~ `###### H6`)
  - 段落（支持丰富的行内样式）
  - **粗体** (`**text**`)、_斜体_ (`*text*`)、**_粗斜体_** (`***text***`)
  - ~~删除线~~ (`~~text~~`)
  - 行内代码 (`` `code` ``)
  - [链接](https://example.com) (`[text](url)`)
  - 无序列表 (`- item`)
  - 有序列表 (`1. item`)
  - 任务列表 (`- [x] 已完成` / `- [ ] 未完成`)
  - 引用块 (`> quote`)
  - 分割线 (`---`)
  - 代码块 (` ```lang `)
    - 复制按钮
    - 语法高亮

---

## 安装

### 方式一：ohpm 安装（推荐）

```bash
ohpm install @ycj3/streaming-markdown
```

或在 DevEco Studio 中：

1. 打开 `entry/oh-package.json5`
2. 点击 dependencies 旁边的 `+` 号
3. 搜索 `@ycj3/streaming-markdown` 并添加

### 方式二：本地 HAR 模块（开发调试）

在项目的 `entry/oh-package.json5` 中添加：

```json5
{
  dependencies: {
    "@ycj3/streaming-markdown": "file:../../streaming-markdown",
  },
}
```

同时，在项目的 `build-profile.json5` 中添加模块声明：

```json5
{
  modules: [
    {
      name: "entry",
      srcPath: "./entry"
    },
    {
      name: "streaming_markdown",
      srcPath: "../streaming-markdown"
    }
  ]
}
```

然后在 DevEco Studio 中同步项目。

---

## 使用示例

```typescript
import { StreamingMarkdown, createStreamingMarkdown } from '@ycj3/streaming-markdown'

@Entry
@Component
struct MyPage {
  private stream = createStreamingMarkdown()

  aboutToAppear() {
    // 模拟流式 Markdown 输入（如 LLM 输出）
    const markdown = `# Hello StreamingMarkdown

This is **bold** and *italic* text.

\`\`\`typescript
console.log("Hello World");
\`\`\`
`
    let i = 0
    const timer = setInterval(() => {
      if (i >= markdown.length) {
        clearInterval(timer)
        this.stream.close()  // 完成解析
        return
      }
      this.stream.push(markdown.charAt(i))  // 逐字符推送
      i++
    }, 30)
  }

  build() {
    Scroll() {
      StreamingMarkdown({ controller: this.stream })
        .padding(16)
    }
    .width('100%')
    .height('100%')
  }
}
```

---

## API 参考

### `createStreamingMarkdown()`

创建一个新的 `StreamingMarkdownController` 实例。

**返回**: `StreamingMarkdownController`

### `StreamingMarkdownController`

流式 Markdown 控制器。

| 方法                  | 说明                           |
| --------------------- | ------------------------------ |
| `push(char: string)`  | 逐字符增量处理                 |
| `close()`             | 完成解析，处理未闭合的行内代码 |
| `subscribe(listener)` | 监听块级 diff 更新             |

### `StreamingMarkdown` 组件

渲染 Markdown 块的 UI 组件。

**属性**:

| 属性         | 类型                          | 说明       |
| ------------ | ----------------------------- | ---------- |
| `controller` | `StreamingMarkdownController` | 控制器实例 |

---

## 架构

```
数据输入      解析器          差异更新       UI 组件
   │            │               │            │
   ▼            ▼               ▼            ▼
┌────────┐  ┌──────────┐    ┌────────┐   ┌──────────┐
│ 字符流  │─▶│BlockReducer│─▶│BlockDiff│──▶│StreamingMarkdown│
│逐字符推送│  │ (状态机)   │    │(不可变更新)│   │(ArkTS List)│
└────────┘  └──────────┘    └────────┘   └──────────┘
```

解析器使用状态机，通过基于 diff 的更新实现流式内容的高效渲染。

---

## 环境要求

- HarmonyOS API 6.0.1+
- DevEco Studio 4.0+

---

## 许可证

Apache-2.0
