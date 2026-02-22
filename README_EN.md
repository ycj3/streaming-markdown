# streaming-markdown

> [中文版本](./README.md)

## 1. Overview

`streaming-markdown` is a streaming Markdown renderer for HarmonyOS (`@ycj3/streaming-markdown`), designed for AI/LLM outputs with incremental rendering to reduce full reflows and layout jumps.

This repository is a monorepo:
- Core library: `packages/streaming-markdown`
- App example: `apps/quickstart-harmony`

## 2. Features

Supported Markdown syntax (current implementation):

- Headings: `#` to `######`
- Paragraphs: plain text paragraphs
- Blockquotes: `> quote`
- Unordered lists: `- item`
- Task lists: `- [ ] todo` / `- [x] done`
- Ordered lists: `1. item`
- Horizontal rules: `---` / `***` / `___`
- Fenced code blocks: `\`\`\`lang ... \`\`\``
- Tables: `| h1 | h2 |`, with alignment `:---` / `:---:` / `---:`
- Inline bold: `**bold**`
- Inline italic: `*italic*`
- Inline bold+italic: `***bold italic***`
- Inline strikethrough: `~~del~~`
- Inline code: `\`code\``
- Links: `[text](url)`
- Inline math: `$x^2$`
- Display math: `$$\frac{1}{2}$$`

Streaming capabilities:
- Push incremental chunks with `MarkdownStream.append(chunk)`
- Mark completion with `MarkdownStream.finish()`
- Bind UI with `StreamingMarkdown({ stream })` for automatic incremental updates

## 3. Installation

### Option 1: Install from package registry (recommended)

```bash
ohpm install @ycj3/streaming-markdown
```

### Option 2: Local file dependency (for local integration/debugging)

Add to `entry/oh-package.json5`:

```json5
{
  dependencies: {
    "@ycj3/streaming-markdown": "file:../../../packages/streaming-markdown",
  },
}
```

Add module declaration to `build-profile.json5`:

```json5
{
  modules: [
    { name: "entry", srcPath: "./entry" },
    { name: "streaming_markdown", srcPath: "../../packages/streaming-markdown" },
  ],
}
```

## 4. Usage

### Render streaming Markdown in a page (minimal integration)

```ts
import { MarkdownStream, StreamingMarkdown } from '@ycj3/streaming-markdown'

@Entry
@Component
struct MessagePage {
  private stream: MarkdownStream = new MarkdownStream({ mode: 'word', interval: 20 })

  aboutToAppear() {
    this.stream.append('# Hello\n\n')
    this.stream.append('This is the first streamed chunk.\n')
    this.stream.append('- item 1\n- item 2\n')
    this.stream.finish()
  }

  build() {
    Scroll() {
      StreamingMarkdown({
        stream: this.stream,
        onComplete: () => {
          console.info('stream completed')
        },
      })
    }
    .width('100%')
    .height('100%')
  }
}
```

### Feed data from SSE / WebSocket style streams

```ts
import { MarkdownStream } from '@ycj3/streaming-markdown'

const stream = new MarkdownStream({ mode: 'word', interval: 20 })

// Pseudo code: forward network deltas to stream
client.onDelta((text: string) => {
  stream.append(text)
})

client.onDone(() => {
  stream.finish()
})

client.onError((_err: Error) => {
  // Optional: end the stream on error to avoid hanging UI state
  stream.finish()
})
```

Full examples:
- [`streaming-markdown QuickStart`](./packages/streaming-markdown/examples/minimal-v2/QuickStartDemo.ets)
- [`Get started with Gemini 3`](./apps/quickstart-harmony/README.md)
