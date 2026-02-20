# streaming-markdown monorepo

This repository uses a monorepo structure.

## Layout

- `packages/streaming-markdown`: HarmonyOS streaming markdown library (`@ycj3/streaming-markdown`)
- `apps/quickstart-harmony`: runnable HarmonyOS quickstart app (with Gemini relay backend)
- `tools/scripts`: workspace scripts

## Common Commands

- Run library tests:

```bash
cd packages/streaming-markdown
bash scripts/run-tests.sh
```

- Start quickstart backend:

```bash
cd apps/quickstart-harmony/backend
npm install
export GEMINI_API_KEY="<your-key>"
npm run dev
```

- Workspace test shortcut:

```bash
bash tools/scripts/test-all.sh
```
