# SSE Relay Backend (Gemini / Qwen)

## 1) Install dependencies

```bash
cd backend
npm install
```

## 2) Configure API keys (at least one)

```bash
export GEMINI_API_KEY="your Gemini API key"
export DASHSCOPE_API_KEY="your DashScope API key"
```

## 3) Start service

```bash
npm run dev
```

Service URLs:
- Gemini: `http://127.0.0.1:3000/api/gemini/stream`
- Qwen: `http://127.0.0.1:3000/api/qwen/stream`

## 4) Optional debug logs

Default output is concise. Enable verbose logs:

```bash
export DEBUG_QUICKSTART=1
npm run dev
```

## 5) Production checklist

See: `../PRODUCTION_CHECKLIST.md`
