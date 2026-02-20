# Streaming Markdown V2 方案（不兼容旧 API）

> 目标：面向真实 LLM token 增量输入，简化接入，优先保证稳定性与性能。

## 1. V2 API 设计（仅新 API）

### 1.1 控制器 API

```ts
export type StreamingMode = 'char' | 'word' | 'chunk'

export interface StreamOptions {
  mode?: StreamingMode
  interval?: number
  autoFlush?: boolean // 默认 true
}

export type StreamState = 'idle' | 'streaming' | 'paused' | 'completed'

export interface StreamSnapshot {
  state: StreamState
  receivedChars: number
  renderedChars: number
}

export class MarkdownStream {
  constructor(options?: StreamOptions)

  append(chunk: string): void      // 新增输入
  finish(): void                   // 输入结束，触发 close 逻辑
  pause(): void
  resume(): void
  reset(): void

  subscribe(listener: (diff: BlockDiff) => void): () => void
  onComplete(listener: () => void): () => void
  getSnapshot(): StreamSnapshot
}
```

核心变化：
- 删除 `start(text)` 一次性输入。
- 统一改为 `append(chunk)` + `finish()`。
- `StreamingMarkdown` 组件不再负责“播放文本”，只消费控制器输出。

### 1.2 组件 API

```ts
export interface StreamingMarkdownProps {
  stream: MarkdownStream
  onComplete?: () => void
}
```

组件职责：
- 订阅 `stream.subscribe` 并渲染 block diffs。
- 在 `aboutToDisappear` 里只做取消订阅，不 `stop/reset` 外部 stream。
- 不再接受 `text/mode/interval`，这些在 stream 构造时指定。

### 1.3 使用方式（真实 LLM）

```ts
const stream = new MarkdownStream({ mode: 'word', interval: 20 })

llm.onToken((token) => {
  stream.append(token)
})

llm.onDone(() => {
  stream.finish()
})
```

## 2. 内部实现要点

### 2.1 双缓冲队列

新增两个缓冲：
- `inputQueue`: append 进来的原始字符
- `renderQueue`: 当前 tick 要处理的字符

处理循环：
1. `append` 只入队，不做重解析。
2. `tick` 按 mode 规则从 `inputQueue` 提取一段到 `renderQueue`。
3. `renderQueue` 逐字符喂给 `BlockReducer.push`。
4. `finish` 后等待队列清空，再 `reducer.close()`，最后触发 `onComplete`。

### 2.2 调度策略

- 仅允许一个活跃 timer。
- `append` 时若 state=idle 自动进入 streaming。
- `pause` 只停 timer，不清理队列。
- `resume` 继续消费队列。

### 2.3 错误与健壮性

- `append('')` 空串直接返回。
- `finish` 幂等。
- `reset` 清队列 + 新建 reducer（避免旧状态污染）。

## 3. 里程碑（两周）

### M1（2-3 天）
- 落地 `MarkdownStream.append/finish`。
- `StreamingMarkdown` 改为 stream-only 组件。
- 移除旧 `text/mode/interval` props。

### M2（2-3 天）
- 移除核心路径调试日志。
- 增加 `debug` 标记（默认 false）。
- 为 `BlockView.parseInlineStyles` 增加基于 `block.id + block.text` 的轻量缓存。

### M3（3-4 天）
- 增加 parser 快照测试（标题/列表/代码/表格/公式至少 30 例）。
- 增加 stream 行为测试（append/pause/resume/finish）。

### M4（2-3 天）
- 产出 benchmark（1k/5k/20k 字）与 release note。

## 4. Demo 仓库更简单的方式

你现在同级 repo 的方式已经可用：
- `entry/oh-package.json5` 用 `file:../../../packages/streaming-markdown`
- `build-profile.json5` 声明 `../../packages/streaming-markdown` 模块

如果要“更简单”，推荐两种方案：

### 方案 A（推荐）：单仓库 examples（最省心）

结构示例：

```txt
streaming-markdown/
  src/...
  examples/harmony-demo/
```

优点：
- 不再跨 repo 相对路径。
- PR 同时改库和 demo，版本一致。
- 文档、脚本、CI 统一。

适用：早期快速迭代阶段（你当前阶段）。

### 方案 B：保留双仓库 + git submodule

在 demo 仓库里把库作为 submodule 固定在 `vendor/streaming-markdown`，依赖改为：

```json5
"@ycj3/streaming-markdown": "file:../vendor/streaming-markdown"
```

优点：
- 两个仓库边界还在。
- 可以固定 demo 依赖的具体 commit，复现性高。

缺点：
- submodule 维护有学习成本。

## 5. 当前建议结论

- 你已明确“早期阶段、不兼容旧 API”，建议直接走 **方案 A（单仓库 examples）**。
- 技术上先做 V2 stream-only API，再做测试和性能，能最快形成可持续迭代底座。
