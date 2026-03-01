# quickstart-harmony

HarmonyOS 快速示例应用，用于演示 `@ycj3/streaming-markdown` 的真实流式渲染与样式配置能力。

## 当前演示能力

- 首页平铺两个入口：
  - `AI 真流`：真实 SSE 流式输出演示
  - `Preset 演示`：本地 Markdown 样式对比演示
- AI 真流页：
  - Provider 切换：`Qwen` / `Gemini`
  - 模型切换：下拉选择（Select / pop menu）
  - 真实逐字流渲染（`MarkdownStream` + `StreamingMarkdown`）
- Preset 演示页：
  - 预设切换：`默认` / `阅读` / `技术`
  - 主题切换：`浅色` / `深色`
  - `加载本地 Markdown 预览`：使用 `previewMarkdown` 对比配置差异
  - `加载 KaTeX 示例`：演示行内公式、块级公式与普通 Markdown 混排

## 目录说明

- `entry/`：HarmonyOS 前端页面（含首页、AI 真流页、Preset 页）
- `backend/`：SSE relay 服务（Qwen / Gemini）
- `PRODUCTION_CHECKLIST.md`：生产接入清单

## 快速启动

### 1) 启动后端

```bash
cd backend
npm install
export GEMINI_API_KEY="你的 Gemini API Key"
export DASHSCOPE_API_KEY="你的 DashScope API Key"
npm run dev
```

可选调试日志：

```bash
export DEBUG_QUICKSTART=1
npm run dev
```

### 2) 配置前端请求地址

在 `entry/src/main/ets/pages/Index.ets` 中修改 `endpointBase`，确保设备可访问：

- 模拟器可用本机可达地址
- 真机不要使用 `127.0.0.1`
- 若使用内网穿透（如 ngrok），填写对应 HTTPS 地址

### 3) 运行应用

在 DevEco Studio 打开 `apps/quickstart-harmony` 并运行 `entry` 模块。

## 如何验证改动

1. 首页应看到两个入口卡片：`AI 真流` 与 `Preset 演示`。  
2. 进入 `AI 真流`：
   - 切换 Provider 与模型下拉项；
   - 输入 Prompt 后开始流式输出；
   - 观察状态从 `idle/streaming` 到完成。  
3. 进入 `Preset 演示`：
   - 切换 `默认/阅读/技术` 与 `浅色/深色`；
   - 点击 `加载本地 Markdown 预览`，观察标题、段落、列表、引用、代码块、表格样式差异；
   - 点击 `加载 KaTeX 示例`，观察 `$...$` 与 `$$...$$` 的公式渲染效果。  

## 相关文档

- 后端说明：[backend/README.md](./backend/README.md))
