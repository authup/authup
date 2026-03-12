# Quick Start

This section will guide you through a quick setup process to get started with development 
and provide details on fully configuring your development environment.

## Prerequisites

Ensure the following software is installed on your system:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (version 20 or higher)


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
$ npm run cli-dev --workspace=packages/server-core -- start
```

Start the frontend in development mode using the CLI.

```shell
$ npm run dev --workspace=packages/client-web
```

Now you should have both the backend and frontend running locally.
- **Frontend** `http://localhost:3000/`
- **Backend** `http://localhost:3001/`
- **Swagger-Docs** `http://localhost:3001/docs`
- **Prometheus-Metrics** `http://localhost:3001/metrics`

You can start working with the application or begin making contributions to the project!
