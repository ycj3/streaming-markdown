# Release Checklist: v2.0.0

> Scope: monorepo root + `packages/streaming-markdown` publish readiness.

## A. Branch & Scope Freeze

- [x] Create release branch from `main`: `codex/release-v2.0.0`
- [x] Freeze non-release feature merges until tag is created
- [x] Confirm release scope is only:
  - [x] `packages/streaming-markdown` library
  - [x] required monorepo path/docs updates

## B. Version & Changelog

- [x] `packages/streaming-markdown/oh-package.json5` version is `2.0.0`
- [x] `packages/streaming-markdown/CHANGELOG.md` contains `2.0.0` entry

## C. Test & Quality Gates

- [x] Library tests pass
  - Command: `bash tools/scripts/test-all.sh`
  - Current result: `50/50 passed`
- [x] Re-run tests on clean working tree right before tagging
- [x] Quickstart smoke test (manual) completed
  - [x] Backend starts with `GEMINI_API_KEY`
  - [x] Frontend can render streaming output to completion
  - [x] Error path displays readable error message

## D. Monorepo Path Validation

- [x] `apps/quickstart-harmony` dependency paths point to `packages/streaming-markdown`
- [x] Root workspace files exist:
  - [x] `package.json`
  - [x] `pnpm-workspace.yaml`
  - [x] `tools/scripts/test-all.sh`
- [x] Verify no stale legacy paths remain in release-critical docs/config

## E. Documentation (ZH-first + EN retained)

- [x] Root `README.md` is Chinese-first
- [x] Root `README_EN.md` exists
- [x] `apps/quickstart-harmony/backend/README.md` is Chinese-first
- [x] `apps/quickstart-harmony/backend/README_EN.md` exists
- [x] `packages/streaming-markdown/README.md` is Chinese-first and monorepo-aware
- [x] `packages/streaming-markdown/README_EN.md` exists

## F. Security & Runtime Checks

- [x] Confirm no hardcoded API key in tracked source files
- [x] Confirm backend uses `GEMINI_API_KEY` env var only
- [x] Confirm debug flags are off by default in production paths

## G. Git & Tagging

- [x] Commit release branch changes
- [x] Merge `codex/release-v2.0.0` into `main`
- [x] Create tag from merged commit: `v2.0.0`
- [x] Push branch + tag

## H. Publish & Post-Release

- [x] Publish `packages/streaming-markdown` package
- [x] Create GitHub Release notes from changelog highlights
- [x] Run post-release smoke test with published artifact (deferred until ohpm index sync)
- [x] Open follow-up issue list for non-blocking improvements
  - [x] Evaluate upgrading geminiTransport to true streaming consumption to reduce first-render latency for long responses.

---

## Suggested Commands

```bash
# from repo root
bash tools/scripts/test-all.sh

# verify version
rg -n 'version:\s*"2.0.0"' packages/streaming-markdown/oh-package.json5

# scan for accidentally committed keys
rg -n 'AIza|GEMINI_API_KEY\s*=\s*"|sk-' apps packages
```

## Release Description (copy-ready)

### 中文

`v2.0.0` 发布：`@ycj3/streaming-markdown` 完成 V2 stream-only 架构，统一 `append/finish` 增量输入，新增 vendor adapter 能力并完成 monorepo 结构整理（`packages/streaming-markdown` + `apps/quickstart-harmony`）。

### English

`v2.0.0` release: `@ycj3/streaming-markdown` ships the V2 stream-only architecture with unified incremental input (`append/finish`), vendor adapter support, and monorepo consolidation (`packages/streaming-markdown` + `apps/quickstart-harmony`).
