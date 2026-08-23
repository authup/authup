# Quick Start

This section will guide you through a quick setup process to get started with development 
and provide details on fully configuring your development environment.

## Prerequisites

Ensure the following software is installed on your system:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (version 22 or higher)


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

Start the frontend in development mode using the CLI.

```shell
$ npm run dev --workspace=apps/client-admin-console
```

Now you should have both the backend and frontend running locally.
- **Frontend** `http://localhost:3000/`
- **Backend** `http://localhost:3001/`
- **Swagger-Docs** `http://localhost:3001/docs`
- **Prometheus-Metrics** `http://localhost:3001/metrics`

You can start working with the application or begin making contributions to the project!
