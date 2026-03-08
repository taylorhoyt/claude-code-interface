# Cutting a release

Create and push a tag matching `v*.*.*` (e.g. `v0.1.0`, `v1.2.3`):

```bash
git tag v0.1.1
git push origin v0.1.1
```

You don’t need to bump the version in `package.json` first. The workflow sets the build version from the tag, so the tag is the source of truth.

The [Release](../.github/workflows/release.yml) workflow runs on tag push: it builds installers for macOS (dmg, zip), Windows (NSIS), and Linux (AppImage), then creates a GitHub Release for that tag and attaches the built artifacts.

To test packaging locally: `npm run build:mac`, `npm run build:win`, or `npm run build:linux` (output in `release/`).
