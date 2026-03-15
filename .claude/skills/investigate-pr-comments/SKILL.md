---
name: investigate-pr-comments
description: Fetches PR review comments from GitHub, investigates each one against the actual codebase, and fixes real issues. Use after a PR review to triage and act on reviewer feedback.
disable-model-invocation: true
allowed-tools: Bash(gh:*) Bash(npx:*) Bash(npm:*) Read Edit Write Glob Grep Agent Skill
argument-hint: "[--dry-run]"
---

# Investigate PR Review Comments

Fetch all review comments on the current PR, investigate each one against the actual code, and fix real issues.

## Step 1: Fetch PR comments

Fetch comments directly using `gh api` and `node -e` for JSON parsing.

**Important:** `jq` is NOT available on this system. Always use `node -e` for JSON parsing. Also, `gh api` paths must NOT start with `/` (MINGW rewrites them to filesystem paths).

```bash
# Get PR number
gh pr view --json number,headRepository

# Get PR-level comments (skip bot summaries)
gh api repos/{owner}/{repo}/issues/{number}/comments | node -e "..."

# Get review comments with file/line context
gh api repos/{owner}/{repo}/pulls/{number}/comments | node -e "..."
```

## Step 2: Investigate each comment

For each review comment (skip bot summaries, walkthrough comments, and pure markdown-lint suggestions on non-code files):

1. **Read the referenced file and line** to understand the current state of the code.
2. **Evaluate the comment** against the actual code:
   - Is the issue still present, or was it already fixed in a later commit?
   - Is the concern valid given the project's architecture and constraints?
   - Does the suggested fix make sense, or does it misunderstand the design?
3. **Classify** the comment:
   - **Real issue** — the code has a bug, security flaw, or correctness problem
   - **Already fixed** — the issue was addressed in a subsequent commit
   - **Invalid** — the reviewer misunderstood the design, constraints, or context
   - **Stylistic** — valid but not worth changing (consistency, preference)

### Context to consider when evaluating

- Check `.agents/*.md` and `CLAUDE.md` for architectural decisions and constraints that may explain the code
- Plan files in `.agents/plans/` are working documents, not shipped code

## Step 3: Fix real issues

For each comment classified as a **real issue**:

1. Apply the fix
2. Run `npx eslint --fix` on changed files
3. Run `npm run test --workspace=<affected-workspace>` to verify

## Step 4: Resolve fixed threads on GitHub

For each comment classified as **Real issue** that was successfully fixed, resolve the review thread on GitHub:

1. Fetch all review thread IDs via GraphQL:
   ```bash
   gh api graphql -f query='{
     repository(owner: "<owner>", name: "<repo>") {
       pullRequest(number: <number>) {
         reviewThreads(first: 50) {
           nodes {
             id
             isResolved
             comments(first: 1) {
               nodes { body path }
             }
           }
         }
       }
     }
   }'
   ```

2. Match each fixed comment to its thread by `path` and body content.

3. Resolve only the threads corresponding to fixed issues:
   ```bash
   gh api graphql -f query='mutation { resolveReviewThread(input: { threadId: "<thread_id>" }) { thread { isResolved } } }'
   ```

Do NOT resolve threads for comments classified as Invalid, Stylistic, or Already fixed — only resolve threads where you applied a code fix.

## Step 5: Report

Present a summary table of all comments:

| Comment | File | Verdict | Action |
|---------|------|---------|--------|
| Short description | `path#line` | Real issue / Already fixed / Invalid / Stylistic | Fixed + Resolved / Fixed / None |

If `--dry-run` was passed as `$ARGUMENTS`, skip Steps 3-4 and only report the classification without making changes or resolving threads.
