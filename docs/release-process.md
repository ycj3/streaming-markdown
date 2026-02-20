# Release Process

## Library release

1. Update changelog in `packages/streaming-markdown/CHANGELOG.md`.
2. Bump version in `packages/streaming-markdown/oh-package.json5`.
3. Run tests:

```bash
bash packages/streaming-markdown/scripts/run-tests.sh
```

4. Tag and publish library package.

## Quickstart app update

- Keep quickstart dependency pointing to `../../packages/streaming-markdown` while developing.
- Validate app + backend flow before release.
