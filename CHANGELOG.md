# 更新日志

## 1.1.0 (2026-02-09)

### ✨ 新功能
- **渲染动画模式**：支持三种渲染粒度，适配不同 LLM 厂商风格
  - `char` - 字符逐个显示（默认，细腻流畅）
  - `word` - 单词逐个显示（类似 GPT-4 风格）
  - `chunk` - 句子/块逐个显示（类似 Claude 风格）
- **简化 API**：`StreamingMarkdown` 组件现在直接使用 props，无需外部管理 controller
- **封装定时器**：渲染定时器逻辑完全封装在组件内部，外部只需传入 `text` 和 `mode`
- **完成回调**：新增 `onComplete` 回调，渲染完成后触发

### ⚠️ 破坏性变更
- **API 变更**：`StreamingMarkdown` 组件改为 props-based API
  - 旧方式：`StreamingMarkdown({ controller: this.stream })`
  - 新方式：`StreamingMarkdown({ text, mode, interval })`
- **重新播放**：使用 `ForEach([renderKey], ...)` + key 变化强制重新创建组件

### 📖 示例
```typescript
// 新 API - 简洁易用
StreamingMarkdown({
  text: '# Hello **World**',
  mode: 'word',      // char | word | chunk
  interval: 30,      // 渲染间隔(ms)
  onComplete: () => console.log('Done!')
})

// 重新播放
ForEach([this.renderKey], () => {
  StreamingMarkdown({...})
}, (key) => key.toString())
```

---

## 1.0.0 (2026-02-06)

### ✨ 新功能
- **初始版本发布**：`@ycj3/streaming-markdown` 首次发布
- **流式渲染**：支持字符级增量解析，实时渲染 Markdown 内容
- **块级架构**：基于不可变 diff 的高效更新机制

### 📝 支持的 Markdown 语法
- **标题**：H1 ~ H6 (`#` ~ `######`)
- **段落**：支持行内样式混排
- **行内样式**：
  - 粗体 (`**text**`)、斜体 (`*text*`)、粗斜体 (`***text***`)
  - 删除线 (`~~text~~`)
  - 行内代码 (`` `code` ``)
  - 链接 (`[text](url)`)
- **列表**：
  - 无序列表 (`- item`)
  - 有序列表 (`1. item`)
  - 任务列表 (`- [x]` / `- [ ]`)
- **引用块**：`> quote`
- **分割线**：`---`
- **代码块**：支持语法高亮和复制按钮

### 🎯 适用场景
- LLM 对话界面的实时流式输出
- 实时日志渲染
- 任何需要增量渲染 Markdown 的场景
