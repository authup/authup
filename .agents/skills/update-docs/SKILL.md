---
name: update-docs
description: Updates documentation files in docs/ when source code changes. Use after modifying packages, apps, or configuration that has corresponding documentation. Discovers relevant doc pages dynamically and updates them to reflect the current code.
compatibility: Requires git and access to the local filesystem.
allowed-tools: Bash(git:*) Read Edit Write Glob Grep
metadata:
  author: authup
  version: "1.0"
---

# Update Documentation on Code Changes

When source code changes, corresponding documentation in `docs/` must be updated to stay accurate.

## Step 1: Identify Changed Files

Determine which source files changed:

```bash
git diff --name-only HEAD~1
# or for uncommitted work:
git diff --name-only HEAD
git diff --name-only --cached
```

Categorize the changes: which packages, apps, or config areas were touched?

## Step 2: Discover Relevant Documentation

Search `docs/**/*.md` for references to the changed code. Look for:

- Import paths or package names (e.g. `@authup/core-kit`, `@authup/core-http-kit`)
- Type names, interface names, function names that were modified
- Feature or module names related to the changes
- Configuration keys or environment variables that changed

Use grep/search to find all doc files that reference the affected code — do not rely on a fixed mapping.

## Step 3: Read and Understand

For each discovered doc file:

1. Read the doc file to understand its current content, structure, and detail level.
2. Read the changed source files to understand what actually changed.
3. Determine if the doc file needs updating based on the changes.

Skip doc files that are stubs (e.g. "coming soon...") unless you have enough context to fill them in meaningfully.

## Step 4: Update Documentation

Apply minimal, accurate updates to each affected doc file:

- **Type/interface changes**: Update TypeScript type blocks.
- **New exports**: Add entries with usage examples.
- **Removed exports**: Remove references.
- **Renamed modules**: Update all references (imports, descriptions, links).
- **New features**: Add a section with a usage example.
- **Configuration changes**: Update option descriptions.

### Rules

- Match the existing style and formatting of each doc file.
- Keep code examples using the public API — do not expose internals.
- Update import paths if package structure changed.
- Do not add sections for internal/private APIs.
- Do not create new doc files unless a wholly new package or app was added.

## Step 5: Verify

After editing, confirm:

1. All markdown links still resolve (no broken cross-references).
2. Code examples use correct import paths and valid API usage.
3. No orphaned references to removed types or modules.
