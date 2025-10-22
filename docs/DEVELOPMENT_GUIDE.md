# Development Guide

## Overview

This guide covers the development workflow for Read-n-Learn, including branch strategy, pull request process, and release management. The project uses a `dev` branch for main development with feature branches, and `main` branch for releases only.

## Branch Strategy

### Branch Structure

```
feature/feature-name → dev → main (with tag for release)
```

### Branch Purposes

- **`main`**: Production-ready code, only updated for releases
- **`dev`**: Main development branch, where all features are integrated
- **`feature/*`**: Individual feature development branches
- **`fix/*`**: Bug fix branches
- **`hotfix/*`**: Critical bug fixes that need immediate release

## Development Workflow

### 1. Starting New Development

#### For New Features:

```bash
# Start from dev branch
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/your-feature-name

# Develop your feature
# ... make changes ...

# Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/your-feature-name
```

#### For Bug Fixes:

```bash
# Start from dev branch
git checkout dev
git pull origin dev

# Create bugfix branch
git checkout -b fix/bug-description

# Fix the bug
# ... make changes ...

# Commit and push
git add .
git commit -m "fix: resolve bug description"
git push origin fix/bug-description
```

### 2. Daily Development Flow

```bash
# Start your day
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/new-feature

# Work on feature
# ... make changes ...

# Commit and push
git add .
git commit -m "feat: implement new feature"
git push origin feature/new-feature

# Create PR to dev
# ... wait for review and merge ...

# After merge, clean up
git checkout dev
git pull origin dev
git branch -d feature/new-feature
```

## Pull Request Process

### 1. Creating Pull Requests

#### Method 1: Using GitHub's Yellow Banner

1. Push your branch to GitHub
2. GitHub shows "Compare & pull request" banner
3. Click the button to create PR

#### Method 2: Manual Creation

1. Go to GitHub repository
2. Click "Pull requests" tab
3. Click "New pull request"
4. Select branches:
    - **Base branch**: `dev` (target)
    - **Compare branch**: `feature/your-feature-name` (your branch)

### 2. PR Configuration

#### Target Branches:

- **Feature branches** → `dev`
- **Bug fixes** → `dev`
- **Release preparation** → `main` (when ready for release)

#### PR Title Examples:

```
feat: add user authentication system
fix: resolve memory leak in reader
docs: update API documentation
refactor: improve code organization
```

#### PR Description Template:

```markdown
## What Changed

- Added user authentication system
- Implemented JWT token handling
- Added login/logout UI components

## Testing

- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] No breaking changes

## Screenshots

[If applicable, add screenshots]

## Related Issues

Closes #123 (if this fixes an issue)
```

### 3. PR Review Process

#### What Happens Automatically:

- ✅ **CI Pipeline runs** (test, build, security)
- ✅ **CodeQL analysis** (security scanning)
- ✅ **All checks must pass** before merge

#### Manual Review:

- Code review by team members
- Ensure feature works as expected
- Check for code quality and standards

### 4. Updating PRs

#### When Code Needs Changes:

```bash
# Make sure you're on your feature branch
git checkout feature/your-feature-name

# Make the requested changes
# ... edit files ...

# Commit the changes
git add .
git commit -m "fix: address review feedback"
git push origin feature/your-feature-name
```

#### What Happens:

- ✅ **PR updates automatically** with new commits
- ✅ **CI pipeline runs again** on updated code
- ✅ **Reviewers get notified** of new commits
- ✅ **All previous comments remain** for context

#### Best Practices for Updates:

- Use descriptive commit messages: `"fix: address review feedback"`
- Respond to review comments
- Click "Resolve conversation" when addressed
- Tag reviewers: `@username what do you think of this approach?`

### 5. Merging PRs

#### Merge Options:

- **"Merge commit"**: Creates a merge commit
- **"Squash and merge"**: Combines all commits into one (recommended for feature branches)
- **"Rebase and merge"**: Replays commits without merge commit

#### Recommended: "Squash and merge"

- Keeps `dev` branch history clean
- One commit per feature
- Easier to track changes

### 6. After Merging

#### Clean Up:

```bash
# Switch back to dev
git checkout dev

# Pull the latest changes
git pull origin dev

# Delete the feature branch locally
git branch -d feature/your-feature-name

# Delete the remote branch (optional)
git push origin --delete feature/your-feature-name
```

## Release Process

### 1. Preparing for Release

#### When Ready to Release:

1. **Create PR from `dev` to `main`:**
    - Target: `main` branch
    - Title: `Release vX.Y.Z`
    - Description: List all changes since last release

2. **After PR is merged to `main`:**

    ```bash
    # Tag the release
    npm run version:patch  # or minor/major
    npm run version:sync
    ```

3. **Release Pipeline Triggers:**
    - GitHub Actions builds artifacts
    - Creates GitHub release
    - Publishes to distribution channels

### 2. Emergency Hotfixes

#### For Critical Bugs:

1. **Create hotfix branch from `main`:**

    ```bash
    git checkout main
    git pull origin main
    git checkout -b hotfix/critical-bug
    ```

2. **Create PR to `main`:**
    - Target: `main` branch
    - Title: `hotfix: resolve critical bug`

3. **After merge, backport to `dev`:**
    ```bash
    git checkout dev
    git cherry-pick <commit-hash>
    git push origin dev
    ```

## CI/CD Pipeline

### 1. Development Pipeline (`ci.yml`)

#### Triggers:

- Push to `dev` branch
- Pull requests to `dev` or `main`

#### Jobs:

- **Test**: TypeScript check, linting, unit tests, coverage
- **Build**: Multi-OS build validation (without artifacts)
- **Security**: NPM audit, Rust cargo audit

#### Purpose:

- Validate code quality during development
- Ensure builds work across all platforms
- Catch issues early in development

### 2. Release Pipeline (`release.yml`)

#### Triggers:

- Push of version tags (`v*`)

#### Jobs:

- **Build**: Multi-OS builds with artifacts
- **Release**: Create GitHub release with assets

#### Purpose:

- Create distributable artifacts
- Publish releases
- Only runs when actually releasing

### 3. CodeQL Pipeline (`codeql.yml`)

#### Triggers:

- Push to `main` or `dev` branches
- Pull requests to `main`
- Weekly schedule

#### Purpose:

- Security analysis
- Code quality scanning
- Vulnerability detection

## Branch Protection Rules (Recommended)

### For `dev` branch:

- Require PR reviews
- Require status checks (CI pipeline)
- Require branches to be up to date

### For `main` branch:

- Require PR reviews
- Require status checks (CI pipeline)
- Require branches to be up to date
- Restrict pushes to administrators only

## Best Practices

### 1. Commit Messages

```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: improve code organization
test: add unit tests
chore: update dependencies
```

### 2. PR Best Practices

- Keep PRs focused and small
- One feature/fix per PR
- Use descriptive titles and descriptions
- Link related issues with "Closes #123"
- Request reviews from team members
- Don't merge your own PRs (if possible)

### 3. Branch Management

- Always create PRs from feature branches to `dev`
- Keep feature branches short-lived
- Delete branches after merging
- Use descriptive branch names

### 4. Code Quality

- Run tests before pushing
- Follow coding standards
- Write meaningful commit messages
- Respond to review feedback promptly

## Troubleshooting

### 1. PR Update Issues

```bash
# If you need to rewrite history
git rebase -i HEAD~3
git push --force-with-lease origin feature/your-feature-name
```

### 2. Branch Conflicts

```bash
# Keep your branch up to date with dev
git checkout dev
git pull origin dev
git checkout feature/your-feature-name
git rebase dev
git push --force-with-lease origin feature/your-feature-name
```

### 3. When to Create New PR

- Changes are completely different from original
- Want to start fresh with clean history
- Original PR has too many commits
- Changing the approach entirely

## Workflow Summary

```
1. Create feature branch from dev
2. Develop feature
3. Create PR to dev
4. Address review feedback
5. Merge to dev
6. When ready: Create PR from dev to main
7. Tag release in main
8. Release pipeline creates artifacts
```

This workflow ensures clean development, proper testing, and controlled releases while maintaining code quality throughout the process.
