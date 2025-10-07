### Version Management

This project uses a single source of truth for the version: the `VERSION` file. Helper scripts keep `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` in sync and create/push Git tags that trigger the release workflow.

### Files and scripts

- `VERSION`: current version (e.g., `0.1.5`)
- `scripts/version-bump.cjs`: bumps `VERSION` using semver
- `scripts/version-sync.cjs`: syncs versions to configs and creates/pushes Git tag

### Typical release flow

```bash
# 1) Choose bump level and update VERSION
npm run version:patch   # or: version:minor | version:major

# 2) Sync to configs and create + push tag (vX.Y.Z)
npm run version:sync

# 3) Push code if needed
git push

# The pushed tag triggers GitHub Actions release workflow automatically
```

### One-off commands

- Show current version

```bash
cat VERSION
```

- Manually set a specific version

```bash
echo 0.2.0 > VERSION
npm run version:sync
```

### What version:sync does

1. Reads `VERSION`
2. Updates:
    - `package.json` → `version`
    - `src-tauri/tauri.conf.json` → `version`
    - `src-tauri/Cargo.toml` → `version = "X.Y.Z"`
3. Creates annotated tag `vX.Y.Z` (skips if it already exists)
4. Pushes the tag (`git push origin vX.Y.Z`)

### Troubleshooting

- Git error: working tree not clean

```bash
git add . && git commit -m "chore: sync version"
# then re-run
npm run version:sync
```

- Tag already exists

```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
npm run version:sync
```

- Release didn’t start
    - Ensure GitHub Actions are enabled and the `release.yml` workflow triggers on tag `v*`.

### Notes

- Keep `VERSION` in source control so changes are reviewable.
- Asset filenames on releases reflect `tauri.conf.json`/Cargo versions, which are kept in sync by these scripts.
