---
name: update-dependency-graph
description: Regenerates the Mermaid package dependency graph in DEPENDENCY_GRAPH.md by scanning all package.json files for @authup/* dependencies.
compatibility: Requires node and access to the local filesystem.
allowed-tools: Bash(node:*) Read Edit Write Glob
metadata:
  author: authup
  version: "1.0"
---

# Update Dependency Graph

Regenerates `DEPENDENCY_GRAPH.md` at the repository root with an accurate Mermaid diagram of all `@authup/*` internal dependencies.

## Step 1: Scan Dependencies

For every `packages/*/package.json` and `apps/*/package.json`, collect all `@authup/*` entries from `dependencies`, `devDependencies`, and `peerDependencies`.

```bash
node -e "
const fs = require('fs');
const path = require('path');
const glob = require('glob') || {};

function scan(pattern) {
  const files = fs.globSync ? fs.globSync(pattern) : require('child_process').execSync('ls ' + pattern).toString().trim().split('\n');
  const result = {};
  for (const f of files) {
    const pkg = JSON.parse(fs.readFileSync(f, 'utf8'));
    const name = pkg.name.replace('@authup/', '');
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    const internal = Object.keys(allDeps).filter(k => k.startsWith('@authup/')).map(k => k.replace('@authup/', ''));
    result[name] = internal;
  }
  return result;
}

const packages = scan('packages/*/package.json');
const apps = scan('apps/*/package.json');
console.log(JSON.stringify({ packages, apps }));
"
```

## Step 2: Classify into Layers

Assign each package to a layer based on its dependency depth:

| Layer | Description |
|-------|-------------|
| Foundation | No `@authup/*` dependencies |
| Layer 1 | Depends only on Foundation packages |
| Layer 2 | Depends on Layer 1 or Foundation |
| Layer 3 | Depends on Layer 2 or below |
| Layer 4 | Depends on Layer 3 or below |
| Application Libraries | `client-web-kit`, `client-web-nuxt` |
| Apps | `apps/*` entries |

## Step 3: Generate Mermaid

Build a Mermaid `graph TD` diagram with:
- `subgraph` blocks for each layer
- Edges from each package to its `@authup/*` dependencies
- Comments separating each layer's edges

## Step 4: Write File

Write the result to `DEPENDENCY_GRAPH.md` with this structure:

```markdown
# Package Dependency Graph

<!-- This file is auto-generated. Update it by running /update-dependency-graph -->

\```mermaid
graph TD
    ...
\```
```

Overwrite the entire file content. Preserve the auto-generated comment.
