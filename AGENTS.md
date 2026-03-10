<!-- 
NOTE: 
Keep this file and README.md updated as the project evolves.
When making architectural changes, adding new patterns,
or discovering important conventions, update the relevant sections.
-->

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
npm run lint                   # lint packages only (not apps)
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

## Tooling

| Tool             | Purpose                                           |
|------------------|---------------------------------------------------|
| NX               | Monorepo task runner (dependency-ordered builds)   |
| Rollup           | Package JS bundling                               |
| Vite             | client-web-slim builds                            |
| Nuxt             | client-web builds                                 |
| Vitest + SWC     | Test runner with fast compilation                  |
| ESLint           | Linting (`@tada5hi/eslint-config-vue-typescript`) |
| Husky            | Pre-commit hooks via lint-staged                   |
| commitlint       | Commit message convention enforcement              |

## Project Structure

The project is a monorepo using TypeScript and ESM modules.
It follows hexagonal architecture principles, separating core business logic, adapters, and interfaces.

### Applications

| Name                                      | Type        | Description                                                                                           |
|-------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------|
| [authup](apps/authup)                     | CLI         | A command line interface for interacting with various applications and services within the ecosystem. |
| [client-web](apps/client-web)             | Application | A Nuxt-based web application interface for end users.                                                 |
| [client-web-slim](apps/client-web-slim)   | Application | A lightweight Vue 3 + Vite web application, alternative to the Nuxt-based client-web.                |
| [server-core](apps/server-core)           | Service     | A service that forms the backbone of the server-side ecosystem.                                       |

### Packages & Libraries

| Name                                            | Type        | Description                                                                                               |
|-------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------|
| [access](packages/access)                       | Library     | A package for evaluating permissions and policies.                                                        |
| [client-web-kit](packages/client-web-kit)       | Library     | A package containing reusable components, composition aids and utilities for the web application.         |
| [client-web-nuxt](packages/client-web-nuxt)     | Library     | A package for the integration in a nuxt web application.                                                  |
| [core-kit](packages/core-kit)                   | Library     | A package providing functions, interfaces and utilities for the core service.                             |
| [core-http-kit](packages/core-http-kit)         | Library     | A package providing a http client with different sub api clients for resources and workflows.             |
| [core-realtime-kit](packages/core-realtime-kit) | Library     | A package for the core socket service.                                                                    |
| [errors](packages/errors)                       | Library     | A package containing error codes and a basic error class via `@ebec/http`.                                |
| [kit](packages/kit)                             | Library     | A package containing general (context independent) utilities.                                             |
| [specs](packages/specs)                         | Library     | A package containing constants, interfaces, utils, ... for different specifications.                      |
| [server-kit](packages/server-kit)               | Library     | A package containing cryptographic algorithms, reusable abstractions for interacting with services, etc.. |

### Package Dependency Layers

Changes to a lower-layer package affect all packages above it. Build order follows these layers.
Internal `@authup/*` dependencies are declared in each package's `package.json` (dependencies, devDependencies, peerDependencies) — always consult those for the authoritative dependency graph.

```
Foundation (no internal @authup deps):
  kit, errors

Layer 1:
  specs             → kit, errors
  core-realtime-kit → kit

Layer 2:
  access            → kit, errors
  core-kit          → kit, errors, specs
  server-kit        → kit, errors, specs, core-realtime-kit

Layer 3:
  core-http-kit     → access, errors, kit, core-kit, specs

Application libraries:
  client-web-kit    → access, kit, core-kit, core-http-kit, core-realtime-kit, errors, specs
  client-web-nuxt   → access, kit, client-web-kit

Apps:
  server-core       → access, kit, core-kit, core-http-kit, errors, server-kit, specs (dev: client-web-slim)
  client-web        → client-web-kit, kit, core-kit, core-http-kit, client-web-nuxt
  client-web-slim   → client-web-kit, kit, core-kit, core-http-kit
  authup (CLI)      → client-web, kit, core-kit, server-core
```

## Architecture

### apps/server-core
The server-core package contains the server-side logic following hexagonal architecture, separating core logic, ports, and adapters.

1. core/ – Domain & Business Logic

The core folder contains the system's business logic. It defines ports (interfaces) and implements logic for authentication, OAuth2 flows, and identity management.

| Folder              | Responsibility                                                                                                                             |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| core/oauth2         | Implements OAuth2 flows (Password, Client Credentials, Refresh Token, etc.). Ports define interfaces for token handling and authorization. |
| core/identity       | Core logic for user and client management, roles, permissions, and policies. Ports define interfaces for entity repositories.              |
| core/authentication | Authentication logic such as password validation                                                                                           |
| core/ldap           | LDAP integration logic                                                                                                                     |
| core/mail           | Email sending logic                                                                                                                        |
| core/entities       | Core entity definitions                                                                                                                    |
| core/di             | Dependency injection setup                                                                                                                 |

Port Example:

```typescript
export interface IUserRepository {
getOne(id: string): Promise<User>;
create(data: Partial<User>): Promise<User>;
update(id: string, data: Partial<User>): Promise<User>;
}
```

Ports are defined in the core and implemented by adapters and modules.

2. adapters – External systems

Adapters connect the core logic to external systems.

| Folder                | Responsibility                                                   |
|-----------------------|------------------------------------------------------------------|
| adapters/database     | Database migrations & entities                                   |
| adapters/http         | Controllers, middlewares implementations that use core services. |
| adapters/shared       | Shared adapters such as LDAP                                     |

3. app/modules/ – Orchestration & Bootstrapping

Modules wire together adapters, ports, and core logic. Configure app startup, register adapters, and set up dependency injection.

| Folder                       | Responsibility                                                                                             |
|------------------------------|------------------------------------------------------------------------------------------------------------|
| app/modules/config           | Reads environment variables and configuration files                                                        |
| app/modules/database         | Implement repositories based on adapters/database typeorm (entities & repositories), bootstrap connections |
| app/modules/http             | Configure and initialize controllers with concrete implementations                                         |
| app/modules/authentication   | Authentication feature wiring                                                                              |
| app/modules/identity         | Identity management wiring                                                                                 |
| app/modules/oauth2           | OAuth2 flow wiring                                                                                         |
| app/modules/ldap             | LDAP integration                                                                                           |
| app/modules/mail             | Email service                                                                                              |
| app/modules/components       | Background components (OAuth2 cleanup, database unique entries)                                            |
| app/modules/cache            | Caching (Redis)                                                                                            |
| app/modules/logger           | Logging (Winston)                                                                                          |
| app/modules/vault            | Secret management                                                                                          |
| app/modules/runtime          | Runtime lifecycle                                                                                          |
| app/modules/swagger          | API documentation generation                                                                               |
| app/modules/provisioning     | Initial data seeding                                                                                       |

## Testing

- **Runner**: Vitest with SWC compiler for fast transpilation
- **Test location**: `test/unit/**/*.spec.ts` within each package/app
- **Config**: `test/vitest.config.ts` per package/app
- **Prerequisite**: `npm run build` before running tests
- **server-core** has database-specific scripts: `test:mysql`, `test:psql`
- **Docker services** for integration tests (`docker-compose.yml`): MySQL (port 3306), PostgreSQL (port 5432), Redis (port 6379), Vault (port 8090), LDAP (port 389/636)

## Validation & Error Handling

- **Validation**: `validup` framework with `@validup/adapter-zod` for Zod schema integration
- **Errors**: `@authup/errors` provides HTTP-aware error classes via `@ebec/http`

## Key Concepts
- Hexagonal Architecture: logic separated across packages.
- Dependency Inversion Principle (DIP): Adapters of server-core package use DIP to inject implementations from core and app (infrastructure)
- TypeScript & ESM: All packages use TypeScript with strict typing and modern ES module syntax.
- No explanatory comments unless explicitly requested. Agents should rely on existing patterns and structure.

## Best Practices

- Use **ESM** and modern TypeScript/JavaScript.
- Prefer **Web APIs** over Node.js-specific APIs where possible.
- Use hexagonal architecture if possible.
- Maintain consistency with existing naming and architectural conventions.
- Before adding new code, always study surrounding patterns, naming conventions, and architectural decisions.
- Respect separation of concerns: domain logic → core-kit, API clients → core-http-kit, UI components → client-web-kit.
- Do not add comments explaining what the line does unless prompted.
