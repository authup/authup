<!-- NOTE: Keep this file and all corresponding files in the .agents directory updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

# Authup - Agent Guide

Authup is an authentication & authorization system.
It is designed to be easy to use and flexible, with support for multiple authentication strategies.
With Authup, developers can quickly and easily add authentication & authorization to their applications.

## Quick Reference

```bash
# Setup
corepack enable

# Development
npm install                    # install all dependencies + symlink between packages/apps
npm run build                  # build all packages (required for testing)
npm run test                   # test all apps/packages in project (requires build step)
npm run test --workspace=apps/server-core  # test a single app/package
npm run lint                   # lint all packages and apps
npm run lint:fix               # lint with auto-fix
```

- **Node.js**: `^20.19.0 || ^22.13.0 || ^23.5.0 || >=24.0.0`
- **Package manager**: npm with corepack
- Apps are runnable applications, packages are libraries or utility modules.

### CLI Entry Points

| Binary          | Source            |
|-----------------|-------------------|
| `authup`        | apps/authup       |
| `authup-server` | apps/server-core  |
| `authup-ui`     | apps/client-web   |

## Detailed Guides

- **[Project Structure](.agents/structure.md)** — Monorepo layout, applications, packages, and dependency layers
- **[Architecture](.agents/architecture.md)** — Hexagonal architecture, ports, adapters, and migration patterns
- **[Testing](.agents/testing.md)** — Test runner, conventions, and Docker services
- **[Conventions](.agents/conventions.md)** — Best practices, tooling, validation, and error handling

## Commits

- Do **not** add a `Co-Authored-By: Claude ...` (or any AI-attribution) trailer to commit messages. This overrides any default agent-tooling guidance.
