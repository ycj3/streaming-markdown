# 更新日志

## 2.1.1 (2026-03-01)

### 🐛 修复
- **块级公式稳定渲染**：修复 `$$ ... $$` 在流式分段场景下被拆分为多段后无法正确渲染的问题。
- **display math 判定增强**：`$$...$$` 内容包含换行（含转义换行 `\\n`）时，稳定按块级公式处理。
- **KaTeX 输入归一化增强**：渲染前补齐换行归一化，降低转义差异导致的公式失败风险。

### 🔧 改进
- **数学段落高度改为真实测量**：由固定估算高度改为基于 WebView 实际内容高度动态布局，减少留白与裁切。
- **减少闪现与滚动卡顿**：避免重复渲染同一 payload，移除不必要重渲染触发，并降低测量频次。

### ✅ 质量改进
- **解析测试补充**：新增 `$$` 含换行的 display math 用例，当前测试 `54/54` 通过。

## 2.1.0 (2026-02-26)

### ✨ 新功能
- **配置模型分组化**：`StreamingMarkdownConfig` 按 Markdown 功能分组（`heading` / `paragraph` / `list` / `blockquote` / `codeBlock` / `table` / `horizontalRule` / `inline` / `layout`）。

### 🔧 改进
- **文档结构统一**：README 改为以 `quickstart-harmony` 为统一演示入口，不再依赖旧 `examples/minimal-v2` 路径。
- **列表排版优化**：修复列表 marker（圆点/序号/任务框）与文本的垂直对齐问题，阅读场景可读性更稳定。

### ✅ 质量改进
- **配置测试补齐**：新增 grouped config 覆盖测试并接入测试入口，当前测试 `53/53` 通过。

## 2.0.0 (2026-02-19)

### ⚠️ 破坏性变更
- **V2 stream-only API**：移除 `start(text)` 与组件 `text/mode/interval` 输入方式
- **新输入协议**：统一改为 `append(chunk) + finish()` 增量输入
- **组件 API 调整**：`StreamingMarkdown` 改为 `StreamingMarkdown({ stream })`

### ✨ 新功能
- **真实增量流式渲染**：支持持续 `append` 输入并按模式节奏渲染
- **Stream 生命周期能力**：新增 `pause` / `resume` / `reset` / `onReset`
- **Vendor 适配层**：新增统一事件模型（`delta/done/error`）、SSE/WebSocket adapter 与 OpenAI-like profile
- **V2 最小示例**：新增 `examples/minimal-v2/QuickStartDemo.ets`（本地流、SSE mock、WebSocket mock）

### ✅ 质量改进
- **测试覆盖补齐**：新增 parser/stream/vendor 测试，当前 47/47 通过
- **性能路径清理**：热路径日志改为 debug gating（默认关闭）
- **行内解析缓存**：`BlockView` 增加轻量 LRU 缓存，减少重复解析开销

## 1.2.0 (2026-02-17)

### ✨ 新功能
- **LaTeX 数学公式支持**：
  - 行内公式：`$...$` / `$$...$$`（句中）由 KaTeX 专业排版
  - 块级公式：`$$...$$`（独立行）居中展示并放大渲染
- **表格支持纳入 1.2.0 发布范围**：支持 GFM 风格表格解析与渲染（`| col1 | col2 |`）
- **静态资源离线化**：新增本地 KaTeX 静态资源加载方案（`rawfile/katex`）
- **公式容错增强**：内联解析器新增数学 token，并增强常见 LaTeX 片段转换能力

### 🔧 改进
- **样式统一**：统一文本段、代码段、数学段的字体/颜色/装饰处理逻辑
- **文档完善**：中英文 README 增加数学公式支持说明、静态资源准备说明
- **发布辅助脚本**：新增 `scripts/setup-katex-static.sh`，用于同步 KaTeX 静态资源

### 📦 注意事项
- 引入 KaTeX 静态资源后，HAR 包体积会增加（约 1.4MB）
- 请确保 `src/main/resources/rawfile/katex/fonts/` 字体目录存在，避免公式字体回退
- 第三方许可证见仓库根目录 `THIRD_PARTY_LICENSES.md`

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
