# Gemini SSE Relay Backend

## 1) Install dependencies

```bash
cd backend
npm install
```

## 2) Configure API key (required)

```bash
export GEMINI_API_KEY="your Gemini API key"
```

## 3) Start service

```bash
npm run dev
```

Service URL: `http://127.0.0.1:3000/api/gemini/stream`

## 4) Optional debug logs

Default output is concise. Enable verbose logs:

```bash
export DEBUG_QUICKSTART=1
npm run dev
```

## 5) Production checklist

See: `../PRODUCTION_CHECKLIST.md`
