### Version Management

This project uses a single source of truth for the version: the `VERSION` file. Helper scripts keep `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` in sync and create/push Git tags that trigger the release workflow.

### Files and scripts

- `VERSION`: current version (e.g., `0.1.5`)
- `scripts/version-bump.cjs`: bumps `VERSION` using semver
- `scripts/version-sync.cjs`: syncs versions to configs and creates/pushes Git tag

### Typical release flow

```bash
# 1) Run pre-release validation (recommended)
npm run pre-release
# Ensures: type-check → lint → test:run → security:audit → tauri:check

# 2) Choose bump level and update VERSION
npm run version:patch   # or: version:minor | version:major

# 3) Sync to configs and create + push tag (vX.Y.Z)
# This will also run security audit and Tauri version checks
npm run version:sync

# 4) Push code if needed
git push

# The pushed tag triggers GitHub Actions release workflow automatically
```

### Pre-release validation

Before releasing, run comprehensive checks to ensure everything is ready:

```bash
# Run all pre-release checks (recommended)
npm run pre-release
# Runs: type-check → lint → test:run → security:audit → tauri:check
```

### Individual validation commands

- **TypeScript check**: `npm run type-check`
- **Linting**: `npm run lint`
- **Tests**: `npm run test:run`
- **Security audit**: `npm run security:audit`
- **Tauri version check**: `npm run tauri:check`

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
3. **Runs security audit** (`npm audit --audit-level=moderate`)
   - Blocks release if vulnerabilities are detected
   - Provides fix instructions if issues found
4. **Checks Tauri version alignment**
   - Compares NPM `@tauri-apps/api` version with Rust `tauri` crate version
   - Blocks release if versions don't match
   - Provides fix instructions if mismatch detected
5. Creates annotated tag `vX.Y.Z` (skips if it already exists)
6. Pushes the tag (`git push origin vX.Y.Z`)

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

- **Security audit fails** (vulnerabilities detected)

```bash
npm run security:audit:fix
npm run security:audit
# If still failing, manually review and fix vulnerabilities
```

- **Tauri version mismatch**

```bash
npm update @tauri-apps/api
cd src-tauri && cargo update
npm run tauri:build  # Test build
npm run tauri:check  # Verify alignment
```

- **Pre-release checks fail**

```bash
# Run individual checks to identify issues
npm run type-check
npm run lint
npm run test:run
npm run security:audit
npm run tauri:check
```

- Release didn't start
    - Ensure GitHub Actions are enabled and the `release.yml` workflow triggers on tag `v*`.

### Notes

- Keep `VERSION` in source control so changes are reviewable.
- Asset filenames on releases reflect `tauri.conf.json`/Cargo versions, which are kept in sync by these scripts.
- **Security**: All releases are automatically checked for vulnerabilities and blocked if issues are found.
- **Tauri Compatibility**: All releases are automatically checked for Tauri version alignment and blocked if mismatched.
- **CI/CD Safety**: These checks prevent common CI/CD build failures before they reach the automated pipeline.
