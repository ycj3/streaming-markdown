# @ycj3/streaming-markdown

A streaming markdown renderer for HarmonyOS ArkTS, designed for real-time LLM chat interfaces.

> [中文版本](./README.md)

---

## Features

- **Streaming Parser**: Incrementally renders markdown as characters arrive (e.g., LLM output)
- **Block-based Architecture**: Efficient updates via immutable diffs, only re-renders changed parts
- **Supported Markdown Syntax**:
  - Headings (`# H1` to `###### H6`)
  - Paragraphs with rich inline styles
  - **Bold** (`**text**`), _Italic_ (`*text*`), **_Bold + Italic_** (`***text***`)
  - ~~Strikethrough~~ (`~~text~~`)
  - Inline code (`` `code` ``)
  - [Links](https://example.com) (`[text](url)`)
  - Unordered lists (`- item`)
  - Ordered lists (`1. item`)
  - Task lists (`- [x] Done` / `- [ ] Todo`)
  - Blockquotes (`> quote`)
  - Horizontal rules (`---`)
  - Fenced code blocks (` ```lang `)
    - Copy button
    - Syntax highlighting

---

## Installation

### Option 1: ohpm install (Recommended)

```bash
ohpm install @ycj3/streaming-markdown
```

Or in DevEco Studio:

1. Open `entry/oh-package.json5`
2. Click the `+` button next to dependencies
3. Search for `@ycj3/streaming-markdown` and add it

### Option 2: Local HAR Module (Development)

Add to your project's `entry/oh-package.json5`:

```json5
{
  dependencies: {
    "@ycj3/streaming-markdown": "file:../../streaming-markdown",
  },
}
```

Also, add the module declaration in your project's `build-profile.json5`:

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

Then sync the project in DevEco Studio.

---

## Usage

```typescript
import { StreamingMarkdown, createStreamingMarkdown } from '@ycj3/streaming-markdown'

@Entry
@Component
struct MyPage {
  private stream = createStreamingMarkdown()

  aboutToAppear() {
    // Simulate streaming markdown (e.g., from LLM)
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
        this.stream.close()  // Finalize parsing
        return
      }
      this.stream.push(markdown.charAt(i))  // Push char by char
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

## API Reference

### `createStreamingMarkdown()`

Creates a new `StreamingMarkdownController` instance.

**Returns**: `StreamingMarkdownController`

### `StreamingMarkdownController`

The controller for managing markdown streaming.

| Method                | Description                                      |
| --------------------- | ------------------------------------------------ |
| `push(char: string)`  | Process a single character incrementally         |
| `close()`             | Finalize parsing, handles incomplete inline code |
| `subscribe(listener)` | Listen for block diff updates                    |

### `StreamingMarkdown` Component

The UI component that renders the markdown blocks.

**Props**:

| Prop         | Type                          | Description             |
| ------------ | ----------------------------- | ----------------------- |
| `controller` | `StreamingMarkdownController` | The controller instance |

---

## Architecture

```
Data Input     Parser       Diff Updates   UI Component
   │            │               │            │
   ▼            ▼               ▼            ▼
┌────────┐  ┌──────────┐    ┌────────┐   ┌──────────┐
│ Char   │─▶│BlockReducer│─▶│BlockDiff│──▶│StreamingMarkdown│
│ Stream │  │(State Machine)│  │(Immutable)│   │(ArkTS List)│
└────────┘  └──────────┘    └────────┘   └──────────┘
```

The parser uses a state machine with diff-based updates for efficient rendering of streaming content.

---

## Requirements

- HarmonyOS API 6.0.1+
- DevEco Studio 4.0+

---

## License

Apache-2.0
