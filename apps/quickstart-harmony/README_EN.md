# quickstart-harmony

HarmonyOS quickstart app for `@ycj3/streaming-markdown`, including Gemini SSE integration.

> [中文版本](./README.md)

## Structure

- `entry/`: HarmonyOS frontend pages
- `backend/`: Gemini SSE relay server
- `PRODUCTION_CHECKLIST.md`: production integration checklist

## Quick Start

### 1) Start backend

```bash
cd backend
npm install
export GEMINI_API_KEY="your Gemini API key"
npm run dev
```

### 2) Configure frontend endpoint

Check `entry/src/main/ets/pages/Index.ets` and set an accessible backend URL (do not use `127.0.0.1` on real devices).

### 3) Run app

Open `apps/quickstart-harmony` in DevEco Studio and run.

## Debug

Enable verbose backend logs:

```bash
export DEBUG_QUICKSTART=1
npm run dev
```

## Related docs

- Backend guide: `backend/README.md`
- Production checklist: `PRODUCTION_CHECKLIST.md`
