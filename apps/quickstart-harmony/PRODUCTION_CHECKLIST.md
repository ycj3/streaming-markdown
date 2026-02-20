# StreamingMarkdownQuickStart Production Checklist

## 1. Network & Topology

- Do not use `127.0.0.1` on real devices. Use LAN IP or domain name.
- Put backend behind HTTPS in production.
- Add request timeout and retry policy at app layer.

## 2. Security

- Never expose Gemini API key in frontend code.
- Keep `GEMINI_API_KEY` only on backend env.
- Configure CORS allowlist instead of wildcard in production.

## 3. Reliability

- Log request id on backend and propagate to client logs if possible.
- Keep `finishOnError=true` unless business requires partial stream recovery.
- Add circuit-breaker/backoff when upstream repeatedly fails.

## 4. UX

- Show clear loading/streaming/error/completed states.
- Add cancel button to call `client.dispose()` for long responses.
- Consider auto-scroll during streaming for chat UX.

## 5. Observability

- Keep debug logs disabled by default.
- Enable `DEBUG_QUICKSTART=1` only for debugging sessions.
- Track latency, error rate, and average response token size.

## 6. Data Validation

- Validate prompt length and forbidden content before forwarding.
- Sanitize error messages returned to frontend.
- Keep markdown rendering guardrails for malformed table/code/math blocks.

## 7. Release Gate

- Verify quickstart works on at least one real device.
- Confirm backend can handle concurrent streaming requests.
- Run library tests before release: `bash ../../packages/streaming-markdown/scripts/run-tests.sh`.
