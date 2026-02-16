# @ycj3/streaming-markdown

HarmonyOS ArkTS 流式 Markdown 渲染器，专为实时 LLM 对话界面设计。

> [English Version](./README_EN.md)

---

## 功能特性

- **实时流式渲染**: 支持 LLM 等实时流式内容，内容随输入即时更新
- **块级架构**: 通过不可变 diff 实现高效更新，只重绘变化的部分
- **渲染动画模式**: 支持三种渲染粒度，适配不同 LLM 厂商风格
  - `char` - 字符逐个显示（默认，细腻流畅）
  - `word` - 单词逐个显示（类似 GPT-4 风格）
  - `chunk` - 句子/块逐个显示（类似 Claude 风格）
- **支持的 Markdown 语法**:
  - 标题 (`# H1` ~ `###### H6`)
  - 段落（支持丰富的行内样式）
  - **粗体** (`**text**`)、_斜体_ (`*text*`)、**_粗斜体_** (`***text***`)
  - ~~删除线~~ (`~~text~~`)
  - 行内代码 (`` `code` ``)
  - LaTeX 数学公式
    - 行内公式 (`$E=mc^2$`)
    - 块级公式 (`$$\int_a^b f(x)\,dx$$`)
    - 在 ArkTS 字符串字面量中请使用双反斜杠：`$$\\int_a^b f(x)\\,dx$$`
    - 段落中的公式会自动走 WebView + KaTeX 专业排版（本地静态资源）
    - 请将 KaTeX 资源放到 `src/main/resources/rawfile/katex/`：
      - `katex.min.js`
      - `katex.min.css`
      - `fonts/`（KaTeX 字体目录）
    - 可使用脚本自动拷贝：`bash scripts/setup-katex-static.sh`
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
      srcPath: "./entry",
    },
    {
      name: "streaming_markdown",
      srcPath: "../streaming-markdown",
    },
  ],
}
```

然后在 DevEco Studio 中同步项目。

---

## 使用示例

> 💡 **[查看完整演示项目](https://github.com/ycj3/streaming-markdown-demo)** - 包含模式切换、重新播放等完整示例代码

### 基础用法

只需传入 `text` 和 `mode`，组件内部自动处理流式渲染：

```typescript
import { StreamingMarkdown } from '@ycj3/streaming-markdown'

@Entry
@Component
struct MyPage {
  private markdown = `# Hello StreamingMarkdown

This is **bold** and *italic* text.

\`\`\`typescript
console.log("Hello World");
\`\`\`
`

  build() {
    Scroll() {
      StreamingMarkdown({
        text: this.markdown,
        mode: 'char'  // 渲染模式：char | word | chunk
      })
        .padding(16)
    }
    .width('100%')
    .height('100%')
  }
}
```

### 不同渲染模式对比

```typescript
import { StreamingMarkdown, StreamingMode } from '@ycj3/streaming-markdown'

@Entry
@Component
struct MyPage {
  @State mode: StreamingMode = 'word'
  // 使用 key 来强制重新创建组件，实现重新播放
  @State renderKey: number = 0

  build() {
    Column() {
      // 模式切换按钮
      Row() {
        Button('Char').onClick(() => {
          this.mode = 'char'
          this.renderKey++
        })
        Button('Word').onClick(() => {
          this.mode = 'word'
          this.renderKey++
        })
        Button('Chunk').onClick(() => {
          this.mode = 'chunk'
          this.renderKey++
        })
        Button('Replay').onClick(() => this.renderKey++)
      }

      // 流式渲染组件 - 使用 .key() 强制重新创建
      StreamingMarkdown({
        text: '# Hello World\n\nThis is a **test**.',
        mode: this.mode,
        interval: 30,        // 渲染间隔(ms)
        onComplete: () => {
          console.log('Done!')
        }
      })
        .key(`markdown_${this.mode}_${this.renderKey}`)
    }
  }
}
```

### 渲染模式说明

| 模式    | 效果            | 适用场景         |
| ------- | --------------- | ---------------- |
| `char`  | 字符逐个显示    | 默认，细腻流畅   |
| `word`  | 单词逐个显示    | 类似 GPT-4 风格  |
| `chunk` | 句子/块逐个显示 | 类似 Claude 风格 |

---

## API 参考

### `StreamingMarkdown` 组件

流式 Markdown 渲染组件，内部封装了控制器和定时器逻辑。

**Props**:

| 属性         | 类型                          | 默认值   | 说明                   |
| ------------ | ----------------------------- | -------- | ---------------------- |
| `text`       | `string`                      | `''`     | 要渲染的 Markdown 文本 |
| `mode`       | `'char' \| 'word' \| 'chunk'` | `'char'` | 渲染动画模式           |
| `interval`   | `number`                      | `30`     | 渲染间隔时间（毫秒）   |
| `onComplete` | `() => void`                  | -        | 渲染完成回调           |

**重新播放**：使用 `ForEach` + `key` 模式强制组件重新创建：

```typescript
@State renderKey: number = 0

// 点击 Replay
this.renderKey++

// 渲染
ForEach([this.renderKey], () => {
  StreamingMarkdown({ text, mode, interval })
}, (key) => key.toString())
```

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
