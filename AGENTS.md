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

- **Node.js**: `>=26.0.0`
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

`authup` is the operator binary and the only one an ordinary deployment runs. It composes the whole ecosystem in process behind ONE listener verb whose positional is a role: `start` (server-core plus every enabled console on one listener), `start core` (the API and the IdP alone), `start worker` (the background worker alone: a health listener only, no migrations), `start console [admin|account|auth]` (one console service, or every enabled one, each on its own port), plus `migration`, `healthcheck` and `config`, and the client side: `login` (the device authorization grant against an operator-supplied client), `logout`, `whoami` and one command per entity under the `api` group (`authup api user list`), which talk to a running deployment over core-http-kit and read no `authup.yml`. `start` validates the role by hand before anything boots, since citty does not check a positional's `options` (see architecture.md → *Process topology*). `apps/server-core` ships no `bin` field, and its `src/cli/` stays as the `defineCLI*Command` source plus dev-only tooling (`npm run cli -w apps/server-core` drives `migration generate`).

The three console SERVICES each ship a `bin` of their own, which starts that service alone against the environment (no `authup.yml`, since the composed document reaches them through the CLI roles). They are the escape hatch for a deployment that runs a console without the CLI; `authup start console` is the supported route.

The console BUNDLES (`apps/client-admin-console`, `apps/client-account-console`, `apps/client-auth-console`) ship no binary and no process: each is a built `dist/` that the matching `apps/server-*-console` service resolves out of `node_modules` and serves.

`create-authup` is the install wizard (`npm create authup`): it writes deployment files for docker run, compose, helm and bare metal and has zero runtime dependencies, so it never runs a service; every file it writes invokes the `authup` CLI or the image.

## Detailed Guides

- **[Project Structure](.agents/structure.md)**: Monorepo layout, applications, packages, and dependency layers
- **[Architecture](.agents/architecture.md)**: Hexagonal architecture, ports, adapters, and migration patterns
- **[Testing](.agents/testing.md)**: Test runner, conventions, and Docker services
- **[Conventions](.agents/conventions.md)**: Best practices, tooling, validation, and error handling
- **[Topic files](.agents/topics/)**: per-subsystem detail (OAuth2, MFA, key store, consoles, query IR, ...), indexed at the end of architecture.md. NOT loaded into every session: read the topic file before changing that area.

### Writing agent docs

The four files above are loaded into every session; the topic files are read on
demand. Both exist to tell a future task what it must know to avoid a silent
breakage. **They are not a changelog, a design record or a test index.**

| Content | Where it goes |
|---|---|
| A cross-cutting rule or an easy-to-break invariant, its reason, and the rejected alternative | One line in a core file, with the issue number |
| A subsystem's invariants and rejected alternatives | Its topic file |
| Mechanism the code already shows | Nowhere, or a code comment |
| How a defect happened, before/after, "pinned by spec X" | The PR description or commit message |
| What changed for operators | CHANGELOG or `docs/src/guide/deployment/upgrading.md` |

The test for a paragraph: would removing it let a reasonable change break
something silently? If not, leave it out.

- **Update docs only when an invariant or a cross-cutting rule changes.** A bug
  fix or a feature that follows the existing rules needs no doc change. Edit
  the existing line; never add a section for a single fix.
- **Never cite a plan** (`plan 078`, `D2-3`, `Stage B`): `.agents/plans/` is
  gitignored. Cite the issue or PR number.
- **Describe what the code does now.** No "used to", "no longer", "before #N".
  The one exception is a rejected alternative: keep the verdict and its
  one-line reason.
- **`npm run lint:agent-docs` enforces it.** Every file has a byte budget and a
  history-phrase budget in `.agents/budget.json` (CI fails above either).
  Budgets only go down: run `node scripts/lint-agent-docs.mjs --update` after
  shortening a file (it keeps about 5% headroom), and never raise one to make
  room. On a pull request CI compares the budgets with the base branch and
  fails on any rise. A new topic file needs a budget entry of at most
  `newTopicBytes`.

## Commits, Issues & Pull Requests

- Commits follow **[Conventional Commits](https://www.conventionalcommits.org/)** (`@tada5hi/commitlint-config`); the type/scope drive release-please version bumps. See [conventions.md](.agents/conventions.md#commit-convention).
- Versioning, `CHANGELOG.md`, `package.json` version, and `.release-please-manifest.json` are owned by **release-please**: do not hand-edit them.
- Do **not** add a `Co-Authored-By: Claude ...` (or any AI-attribution) trailer to commit messages. This overrides any default agent-tooling guidance.
- Do **not** add AI-attribution lines (e.g. `🤖 Generated with [Claude Code](...)`) to issue or pull request titles, bodies, or comments.

## Licensing

Authup is dual-licensed (see [LICENSING.md](LICENSING.md)): the apps (`server-core`, `server-admin-console`, `server-account-console`, `server-auth-console`, `client-admin-console`, `client-account-console`, `client-auth-console`, `authup`) are `AGPL-3.0-only` (+ commercial); every package under `packages/` is `Apache-2.0`. The blanket rule has a consequence worth stating outright: `@authup/server-console-kit` holds the console-serving MECHANISM (the shell splice, the security headers, `defineStaticConsole`, the whole theme subsystem), so that mechanism is permissively licensed, while the three console SERVICES built on it stay AGPL. That was accepted deliberately rather than stumbled into. When scaffolding a new workspace, copy the `LICENSE` file and `package.json` `license` field from an existing sibling in the same group: new packages default to Apache-2.0, new apps to AGPL-3.0-only. Releases up to and including `v1.0.0-beta.46` remain Apache-2.0 (the change is not retroactive).
