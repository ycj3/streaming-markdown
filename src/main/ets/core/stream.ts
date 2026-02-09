import { BlockReducer } from "./reducer";
import { BlockDiff } from "./protocol";

type Listener = (diff: BlockDiff) => void;

export class StreamingMarkdownController {
  private reducer = new BlockReducer();
  private listeners: Listener[] = [];

  push(token: string) {
    const diffs = this.reducer.push(token);
    diffs.forEach((diff) => {
      this.listeners.forEach((l) => l(diff));
    });
  }

  close() {
    const diffs = this.reducer.close();
    diffs.forEach((diff) => {
      this.listeners.forEach((l) => l(diff));
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export function createStreamingMarkdown() {
  return new StreamingMarkdownController();
}
