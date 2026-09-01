# Quick Start

This section will guide you through a quick setup process to get started with development 
and provide details on fully configuring your development environment.

## Prerequisites

Ensure the following software is installed on your system:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (`^22.13.0 || ^23.5.0 || >=24.0.0`)


## Steps
### 1. Clone the Repository

Clone the Authup repository to a local directory using Git:
```shell
git clone https://github.com/authup/authup 
cd authup
```

### 2. Install Dependencies

Install all required (dev-) dependencies for the monorepo.
```shell
npm i
```

### 3. Start the Development Servers

Build once, then start the one dev loop from the repository root:

```shell
$ npm run build
$ npm run dev
```

This runs `authup dev`. It is EXPERIMENTAL, and it is exactly `authup start`
(server-core plus every enabled console on one listener), except that every
console whose package resolves to a SOURCE checkout is served through a
vite dev server with hot module replacement instead of from its built
`dist/`. In this workspace that is all three consoles. Because everything
stays on one origin, the dev loop signs in with the same `HttpOnly` session
cookie a served console uses in production, not the standalone browser
authorization-code flow.

The workspace additionally runs `server-core` itself from its TypeScript
source (`ts-node/esm`, no build step), so an edit there needs a restart, not
a rebuild. A published install ships `dist/` and no source, so `authup dev`
there falls back to `dist/`, exactly like `start`.

- **Backend + every console** `http://localhost:3000/`
- **Admin console** `http://localhost:3000/console/admin`
- **Account console** `http://localhost:3000/console/account`
- **Auth console** (login, `/register`, `/activate`, ...) `http://localhost:3000/console/auth/authorize`
- **Swagger-Docs** `http://localhost:3000/docs`
- **Prometheus-Metrics** `http://localhost:3000/metrics`

Each console's vite dev server opens its own hot-module-replacement
websocket: 24678 (auth), 24679 (admin), 24680 (account).

What is hot, and what still needs a restart or a rebuild:

| Edited | Effect |
|--------|--------|
| `apps/client-*-console/src/**` | Hot module replacement |
| `packages/client-web-kit/src/**`, the two theme packages | Hot module replacement |
| `apps/server-core/src/**` | No build; restart the process |
| `apps/authup/src/**` | No build; restart the process |
| `packages/server-*`, `packages/kit`, `packages/errors`, the console services | `npm run build -w <workspace>` required |

The last row is the honest limit: `ts-node` applies no tsconfig `paths` at
runtime, so those packages still resolve to their built `dist/`. The first
two rows are also why every console's vite config aliases
`@authup/client-web-kit` (and the two theme packages) to source: one edit
there hot-updates every console that imports it, the server-rendered auth
pages included. That is the single biggest practical reason to use
`npm run dev` over building each package by hand.

To work on one console alone, on its own origin, run its own dev server
instead:

```shell
$ VITE_API_URL=http://localhost:3000 npm run dev --workspace=apps/client-admin-console
```

It gives hot module replacement against the running backend, but it costs
fidelity: served on a different origin (`http://localhost:3010` for the
admin console) than the API, it signs in with the standalone browser
authorization-code (PKCE) flow rather than the cookie-session credential a
served console uses in production.

You can start working with the application or begin making contributions to the project!
