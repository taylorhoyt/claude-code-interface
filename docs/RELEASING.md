# Cutting a release

1. **Bump the version** in `package.json` (e.g. `"version": "0.1.0"`).
2. **Commit and push** the change.
3. **Create and push a tag** matching `v*.*.*`:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

The [Release](../.github/workflows/release.yml) workflow runs on tag push: it builds installers for macOS (dmg, zip), Windows (NSIS), and Linux (AppImage), then creates a GitHub Release for that tag and attaches the built artifacts.

To test packaging locally: `npm run build:mac`, `npm run build:win`, or `npm run build:linux` (output in `release/`).
