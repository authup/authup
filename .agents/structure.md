# Project Structure

The project is a monorepo using TypeScript and ESM modules.
It follows hexagonal architecture principles, separating core business logic, adapters, and interfaces.

## Applications

| Name                                      | Type        | Description                                                                                           |
|-------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------|
| [authup](../apps/authup)                  | CLI         | A command line interface for interacting with various applications and services within the ecosystem. |
| [client-web](../apps/client-web)          | Application | A Nuxt-based web application interface for end users.                                                 |
| [client-web-slim](../apps/client-web-slim)| Application | A lightweight Vue 3 + Vite web application, alternative to the Nuxt-based client-web.                |
| [server-core](../apps/server-core)        | Service     | A service that forms the backbone of the server-side ecosystem.                                       |

## Packages & Libraries

| Name                                            | Type        | Description                                                                                               |
|-------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------|
| [access](../packages/access)                    | Library     | A package for evaluating permissions and policies.                                                        |
| [client-web-kit](../packages/client-web-kit)    | Library     | A package containing reusable components, composition aids and utilities for the web application.         |
| [client-web-nuxt](../packages/client-web-nuxt)  | Library     | A package for the integration in a nuxt web application.                                                  |
| [core-kit](../packages/core-kit)                | Library     | A package providing functions, interfaces and utilities for the core service.                             |
| [core-http-kit](../packages/core-http-kit)      | Library     | A package providing a http client with different sub api clients for resources and workflows.             |
| [core-realtime-kit](../packages/core-realtime-kit)| Library   | A package for the core socket service.                                                                    |
| [errors](../packages/errors)                    | Library     | A package containing error codes and a basic error class via `@ebec/http`.                                |
| [kit](../packages/kit)                          | Library     | A package containing general (context independent) utilities.                                             |
| [specs](../packages/specs)                      | Library     | A package containing constants, interfaces, utils, ... for different specifications.                      |
| [server-kit](../packages/server-kit)            | Library     | A package containing cryptographic algorithms, reusable abstractions for interacting with services, etc.. |

## Package Dependency Layers

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

## Separation of Concerns

- **Domain logic** → core-kit
- **API clients** → core-http-kit
- **UI components** → client-web-kit
