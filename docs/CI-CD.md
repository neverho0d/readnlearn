# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions for continuous integration and deployment. The pipeline includes testing, building, security auditing, and automated releases.

## Workflows

### 1. Main CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**

- Push to `main` or `dev` branches
- Pull requests to `main` or `dev` branches

**Jobs:**

#### Test & Coverage

- Runs on Ubuntu latest
- Installs Node.js 20 with npm caching
- Executes type checking, linting, and tests with coverage
- Uploads coverage reports to Codecov

#### Build Application

- Runs on Ubuntu, Windows, and macOS
- Builds Tauri application for all platforms
- Requires Tauri signing keys (configured as secrets)
- Uploads build artifacts

#### Security Audit

- Runs npm audit for dependency vulnerabilities
- Runs cargo audit for Rust dependencies

### 2. Release Pipeline (`.github/workflows/release.yml`)

**Triggers:**

- Push to tags matching `v*` pattern

**Features:**

- Builds application for all platforms
- Creates GitHub release with artifacts
- Generates release notes automatically

### 3. CodeQL Analysis (`.github/workflows/codeql.yml`)

**Triggers:**

- Push to `main` or `dev` branches
- Pull requests to `main`
- Weekly schedule (Sundays at midnight)

**Features:**

- Static code analysis for JavaScript/TypeScript
- Security vulnerability detection
- Code quality insights

### 4. Rust Security Audit (`.github/workflows/rust-audit.yml`)

**Triggers:**

- Push to `main` or `dev` branches
- Pull requests to `main` or `dev`
- Weekly schedule (Mondays at 2 AM)

**Features:**

- Cargo audit for Rust dependencies
- Security vulnerability scanning

## Required Secrets

Configure these secrets in your GitHub repository settings:

### For Building and Signing

- `TAURI_PRIVATE_KEY`: Private key for code signing
- `TAURI_KEY_PASSWORD`: Password for the private key

### For Coverage Reporting

- `CODECOV_TOKEN`: Token for Codecov integration (optional)

## Local Development

### Pre-commit Checks

Run these commands before pushing:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Testing with coverage
npm run test:coverage

# Security audit
npm run security:audit

# Full CI pipeline locally
npm run ci
```

### Building Locally

```bash
# Build web assets
npm run build

# Build Tauri application
npm run tauri:build

# Or run both
npm run ci:build
```

## Dependabot Configuration

Automated dependency updates are configured via `.github/dependabot.yml`:

- **npm**: Weekly updates on Mondays at 9 AM
- **GitHub Actions**: Weekly updates on Mondays at 9 AM
- **Cargo**: Weekly updates on Mondays at 9 AM

## Issue and PR Templates

- Bug report template: `.github/ISSUE_TEMPLATE/bug_report.md`
- Feature request template: `.github/ISSUE_TEMPLATE/feature_request.md`
- Pull request template: `.github/pull_request_template.md`

## Artifacts

### Build Artifacts

- Linux: `readnlearn-linux-*.tar.gz`
- Windows: `readnlearn-windows-*.msi`
- macOS: `readnlearn-macos-*.dmg`

### Coverage Reports

- LCOV format: `coverage/lcov.info`
- HTML reports: `coverage/index.html`

## Monitoring

### Build Status

- Check the "Actions" tab in GitHub for build status
- Green checkmarks indicate successful builds
- Red X marks indicate failed builds

### Coverage Reports

- View coverage reports on Codecov (if configured)
- Local coverage reports in `coverage/` directory

### Security Alerts

- GitHub will show security alerts in the repository
- Dependabot will create PRs for security updates
- CodeQL will show security analysis results

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify Tauri CLI is installed
   - Ensure all dependencies are installed

2. **Test Failures**
   - Run tests locally first
   - Check for environment-specific issues
   - Verify test data and mocks

3. **Security Audit Failures**
   - Update vulnerable dependencies
   - Use `npm audit fix` for automatic fixes
   - Review and address manual fixes

### Getting Help

- Check GitHub Actions logs for detailed error messages
- Run commands locally to reproduce issues
- Review the workflow files for configuration issues
