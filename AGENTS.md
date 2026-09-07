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
npm run dev                    # EXPERIMENTAL: server-core from TS + every console from source with HMR, one origin
npm run test                   # test all apps/packages in project (requires build step)
npm run test --workspace=apps/server-core  # test a single app/package
npm run lint                   # lint all packages and apps
npm run lint:fix               # lint with auto-fix
```

- **Node.js**: `^22.13.0 || ^23.5.0 || >=24.0.0` (Node 20 is no longer supported)
- **Package manager**: npm with corepack
- Apps are runnable applications, packages are libraries or utility modules.

### CLI Entry Points

| Binary                     | Source                          |
|----------------------------|---------------------------------|
| `authup`                   | apps/authup                     |
| `authup-admin-console`     | apps/server-admin-console       |
| `authup-account-console`   | apps/server-account-console     |
| `authup-auth-console`      | apps/server-auth-console        |
| `create-authup`            | packages/create-authup          |

`authup` is the operator binary and the only one an ordinary deployment runs. It composes the whole ecosystem in process behind ONE listener verb whose positional is a role: `start` (server-core plus every enabled console on one listener), `start core` (the API and the IdP alone), `start worker` (the background worker alone: no listener, no migrations), `start console [admin|account|auth]` (one console service, or every enabled one, each on its own port), plus `migration`, `healthcheck` and `config`. `start` validates the role by hand before anything boots, since citty does not check a positional's `options` (see architecture.md → *Process topology*). `apps/server-core` ships no `bin` field, and its `src/cli/` stays as the `defineCLI*Command` source plus dev-only tooling (`npm run cli -w apps/server-core` drives `migration generate`).

The three console SERVICES each ship a `bin` of their own, which starts that service alone against the environment (no `authup.yml`, since the composed document reaches them through the CLI roles). They are the escape hatch for a deployment that runs a console without the CLI; `authup start console` is the supported route.

The console BUNDLES (`apps/client-admin-console`, `apps/client-account-console`, `apps/client-auth-console`) ship no binary and no process: each is a built `dist/` that the matching `apps/server-*-console` service resolves out of `node_modules` and serves.

`create-authup` is the install wizard (`npm create authup`): it writes deployment files for docker run, compose, helm and bare metal and has zero runtime dependencies, so it never runs a service; every file it writes invokes the `authup` CLI or the image.

## Detailed Guides

- **[Project Structure](.agents/structure.md)** — Monorepo layout, applications, packages, and dependency layers
- **[Architecture](.agents/architecture.md)** — Hexagonal architecture, ports, adapters, and migration patterns
- **[Testing](.agents/testing.md)** — Test runner, conventions, and Docker services
- **[Conventions](.agents/conventions.md)** — Best practices, tooling, validation, and error handling


## Commits, Issues & Pull Requests

- Commits follow **[Conventional Commits](https://www.conventionalcommits.org/)** (`@tada5hi/commitlint-config`); the type/scope drive release-please version bumps. See [conventions.md](.agents/conventions.md#commit-convention).
- Versioning, `CHANGELOG.md`, `package.json` version, and `.release-please-manifest.json` are owned by **release-please** — do not hand-edit them.
- Do **not** add a `Co-Authored-By: Claude ...` (or any AI-attribution) trailer to commit messages. This overrides any default agent-tooling guidance.
- Do **not** add AI-attribution lines (e.g. `🤖 Generated with [Claude Code](...)`) to issue or pull request titles, bodies, or comments.

## Licensing

Authup is dual-licensed (see [LICENSING.md](LICENSING.md)): the apps (`server-core`, `server-admin-console`, `server-account-console`, `server-auth-console`, `client-admin-console`, `client-account-console`, `client-auth-console`, `authup`) are `AGPL-3.0-only` (+ commercial); every package under `packages/` is `Apache-2.0`. The blanket rule has a consequence worth stating outright: `@authup/server-console-kit` holds the console-serving MECHANISM (the shell splice, the security headers, `defineStaticConsole`, the whole theme subsystem), so that mechanism is permissively licensed, while the three console SERVICES built on it stay AGPL. That was accepted deliberately in plan 101 D2-2 rather than stumbled into. When scaffolding a new workspace, copy the `LICENSE` file and `package.json` `license` field from an existing sibling in the same group: new packages default to Apache-2.0, new apps to AGPL-3.0-only. Releases up to and including `v1.0.0-beta.46` remain Apache-2.0 (the change is not retroactive).
