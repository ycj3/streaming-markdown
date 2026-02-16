# @ycj3/streaming-markdown

A streaming markdown renderer for HarmonyOS ArkTS, designed for real-time LLM chat interfaces.

> [中文版本](./README.md)

---

## Features

- **Real-time Streaming**: Supports real-time streaming content like LLM output, updates instantly as input arrives
- **Block-based Architecture**: Efficient updates via immutable diffs, only re-renders changed parts
- **Rendering Animation Modes**: Three rendering granularities adapting to different LLM vendor styles
  - `char` - Character by character (default, smooth and detailed)
  - `word` - Word by word (similar to GPT-4 style)
  - `chunk` - Sentence/chunk by chunk (similar to Claude style)
- **Supported Markdown Syntax**:
  - Headings (`# H1` to `###### H6`)
  - Paragraphs with rich inline styles
  - **Bold** (`**text**`), _Italic_ (`*text*`), **_Bold + Italic_** (`***text***`)
  - ~~Strikethrough~~ (`~~text~~`)
  - Inline code (`` `code` ``)
  - LaTeX math expressions
    - Inline math (`$E=mc^2$`)
    - Display math (`$$\int_a^b f(x)\,dx$$`)
    - In ArkTS string literals, use escaped backslashes: `$$\\int_a^b f(x)\\,dx$$`
    - Equations in paragraphs use WebView + KaTeX for professional typesetting (local static assets)
    - Put KaTeX files under `src/main/resources/rawfile/katex/`:
      - `katex.min.js`
      - `katex.min.css`
      - `fonts/` (KaTeX font directory)
    - Auto-copy script: `bash scripts/setup-katex-static.sh`
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

> 💡 **[View Full Demo Project](https://github.com/ycj3/streaming-markdown-demo)** - Complete examples including mode switching and replay functionality

### Basic Usage

Just pass `text` and `mode`, the component handles streaming internally:

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
        mode: 'char'  // render mode: char | word | chunk
      })
        .padding(16)
    }
    .width('100%')
    .height('100%')
  }
}
```

### Different Rendering Modes

```typescript
import { StreamingMarkdown, StreamingMode } from '@ycj3/streaming-markdown'

@Entry
@Component
struct MyPage {
  @State mode: StreamingMode = 'word'
  // Use key to force component re-creation for replay
  @State renderKey: number = 0

  build() {
    Column() {
      // Mode switch buttons
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

      // Streaming component - use .key() to force re-creation
      StreamingMarkdown({
        text: '# Hello World\n\nThis is a **test**.',
        mode: this.mode,
        interval: 30,        // render interval (ms)
        onComplete: () => {
          console.log('Done!')
        }
      })
        .key(`markdown_${this.mode}_${this.renderKey}`)
    }
  }
}
```

### Render Modes

| Mode | Effect | Use Case |
|------|--------|----------|
| `char` | Character by character | Default, smooth |
| `word` | Word by word | Similar to GPT-4 |
| `chunk` | Sentence/chunk by chunk | Similar to Claude |

---

## API Reference

### `StreamingMarkdown` Component

Streaming markdown render component, internally encapsulates controller and timer logic.

**Props**:

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `text` | `string` | `''` | Markdown text to render |
| `mode` | `'char' \| 'word' \| 'chunk'` | `'char'` | Render animation mode |
| `interval` | `number` | `30` | Render interval (milliseconds) |
| `onComplete` | `() => void` | - | Completion callback |

**Replay**: Use `ForEach` + `key` pattern to force component re-creation:

```typescript
@State renderKey: number = 0

// Click Replay
this.renderKey++

// Render
ForEach([this.renderKey], () => {
  StreamingMarkdown({ text, mode, interval })
}, (key) => key.toString())
```

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
