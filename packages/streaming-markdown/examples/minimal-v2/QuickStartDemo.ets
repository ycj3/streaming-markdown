import { MarkdownStream, StreamingMarkdown } from '@ycj3/streaming-markdown'

@Entry
@Component
struct QuickStartDemo {
  private stream: MarkdownStream = new MarkdownStream({ mode: 'word', interval: 20 })
  private timer: number = -1

  @State private status: string = 'idle'

  aboutToDisappear() {
    this.stopPlayback()
  }

  private stopPlayback(): void {
    if (this.timer >= 0) {
      clearTimeout(this.timer)
      this.timer = -1
    }
  }

  private resetForRun(label: string): void {
    this.stopPlayback()
    this.stream.reset()
    this.status = label
  }

  private playChunks(chunks: string[], label: string): void {
    this.resetForRun(label)

    let index: number = 0
    const pump = (): void => {
      if (index >= chunks.length) {
        this.stream.finish()
        this.timer = -1
        return
      }
      this.stream.append(chunks[index])
      index += 1
      this.timer = setTimeout((): void => pump(), 120) as number
    }

    pump()
  }

  private runLocalMock(): void {
    this.playChunks([
      '# 本地模拟流\n\n',
      '直接调用 `append` 持续追加。\n\n',
      '- chunk 1\n',
      '- chunk 2\n',
      '最后调用 `finish()`。\n',
    ], 'local-streaming')
  }

  private runSseMock(): void {
    this.playChunks([
      '# SSE (mock)\n\n',
      '用数组模拟 SSE data 分帧输入。\n\n',
      '真实接入时：收到每个 data 就 `append`。\n',
      '结束标记（如 [DONE]）后 `finish`。\n',
    ], 'sse-streaming')
  }

  private runWebSocketMock(): void {
    this.playChunks([
      '# WebSocket (mock)\n\n',
      '用数组模拟 WS message 分帧输入。\n\n',
      '真实接入时：每条 message -> `append`。\n',
      '连接关闭（或业务结束）后 `finish`。\n',
    ], 'websocket-streaming')
  }

  build() {
    Column({ space: 10 }) {
      Text(`status: ${this.status}`).fontSize(14)

      Row({ space: 8 }) {
        Button('本地模拟流').onClick((): void => this.runLocalMock())
        Button('SSE(mock)').onClick((): void => this.runSseMock())
        Button('WebSocket(mock)').onClick((): void => this.runWebSocketMock())
      }

      Scroll() {
        StreamingMarkdown({
          stream: this.stream,
          onComplete: (): void => {
            this.status = 'completed'
          },
        })
      }
      .width('100%')
      .layoutWeight(1)
      .backgroundColor('#ffffff')
      .border({ width: 1, color: '#dddddd' })
    }
    .padding(12)
    .width('100%')
    .height('100%')
  }
}
