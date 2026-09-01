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

Start the backend in development mode using the CLI.

```shell
$ npm run cli-dev --workspace=apps/server-core -- start
```

This runs the server from its TypeScript source through `ts-node` (no build step) and serves the
hosted auth pages (`/authorize`, `/register`, ...) from the `apps/client-auth-console` source through
an embedded vite dev server, so an edit there shows up on the next request. The `@authup/*` packages
are still resolved from their built `dist/`, so run `npm run build` once after pulling. Expect a
`--experimental-loader` warning on start; it is harmless. To run the built server instead, use
`npm run build --workspace=apps/server-core` followed by `npm run cli --workspace=apps/server-core -- start`.

The backend also serves the admin console at `http://localhost:3000/console/admin` and
the account console at `http://localhost:3000/console/account`, from the built bundle
of each package. Build the admin console BEFORE starting the backend (and
restart the backend after rebuilding it): the asset mount is decided at boot,
so a bundle built afterwards is not served until the next start.

```shell
$ npm run build --workspace=apps/client-admin-console
```

To work on the admin console itself, run its vite dev server instead. It gives
you hot module replacement and talks to the backend across origins:

```shell
$ VITE_API_URL=http://localhost:3000 npm run dev --workspace=apps/client-admin-console
```

Now you should have the backend and the console dev server running locally.
- **Admin console (dev server)** `http://localhost:3000/console/admin/`
- **Admin console (served)** `http://localhost:3000/console/admin`
- **Account console** `http://localhost:3000/console/account`
- **Backend** `http://localhost:3000/`
- **Swagger-Docs** `http://localhost:3000/docs`
- **Prometheus-Metrics** `http://localhost:3000/metrics`

The dev server's origin (`http://localhost:3000`) is trusted automatically
outside production, so its login redirect works without any configuration.
Because it is a different origin than the API, it signs in with the
browser-side authorization-code flow rather than the server session cookie the
served console uses.

You can start working with the application or begin making contributions to the project!
