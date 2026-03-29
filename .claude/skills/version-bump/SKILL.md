---
name: version-bump
description: Touches all packages that have no direct commits since the last release so release-please assigns the correct linked version instead of computing a wrong patch bump. Updates copyright years as the no-op change.
compatibility: Requires git and access to the local filesystem.
allowed-tools: Bash(git:*) Read Edit Glob Grep
metadata:
  author: authup
  version: "1.0"
---

# Version Bump (release-please workaround)

When release-please creates a release PR, packages that have no direct commits (only dependency bumps) may get a wrong version like `1.0.1-beta.30` instead of the expected `1.0.0-beta.31`. This skill creates a no-op commit touching those packages so release-please picks them up correctly.

## Step 1: Identify affected packages

Check the open release-please PR for packages that got the wrong version:

```bash
gh pr list --search "chore: release master" --state open --json number --jq '.[0].number'
```

Then diff that PR to find which `package.json` files have a version mismatch (e.g. `1.0.1-beta.X` instead of `1.0.0-beta.Y`):

```bash
gh pr diff <PR_NUMBER> 2>&1 | grep -B20 '"version": "1.0.1-' | grep "^diff"
```

Extract the package paths from those diff lines.

## Step 2: Touch each affected package

For each affected package, update the copyright year in `src/index.ts` to the current year. This is a minimal, meaningful change that gives the package a direct commit.

Example: `Copyright (c) 2022-2024.` becomes `Copyright (c) 2022-2026.`

If the copyright is already current, add a blank line or update another trivial file in the package.

## Step 3: Commit

Create a single commit with all touched files:

```
fix: ensure consistent version for release
```

This commit touches all affected packages so release-please will assign them the correct linked version from `release-as` in `release-please-config.json`.

## Step 4: Push and verify

After the user reviewed the changes and pushed the commit, wait for release-please to update the PR. Verify all packages now show the correct version.
