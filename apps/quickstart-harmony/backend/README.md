# SSE Relay 后端（Gemini / Qwen）

## 1) 安装依赖

```bash
cd backend
npm install
```

## 2) 配置 API Key（至少填一个）

```bash
export GEMINI_API_KEY="你的 Gemini API Key"
export DASHSCOPE_API_KEY="你的 DashScope API Key"
```

## 3) 启动服务

```bash
npm run dev
```

服务地址：
- Gemini: `http://127.0.0.1:3000/api/gemini/stream`
- Qwen: `http://127.0.0.1:3000/api/qwen/stream`

## 4) 可选调试日志

默认输出精简日志。开启详细日志：

```bash
export DEBUG_QUICKSTART=1
npm run dev
```

## 5) 生产接入清单

见：`../PRODUCTION_CHECKLIST.md`
