<!-- NOTE: Keep this file updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

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
```

Note: apps are runnable applications, packages are libraries or utility modules.

## Project Structure

The project is a monorepo using TypeScript and ESM modules.
It follows hexagonal architecture principles, separating core business logic, adapters, and interfaces.

### Applications

| Name                             | Type        | Description                                                                                               |
|----------------------------------|-------------|-----------------------------------------------------------------------------------------------------------|
| [authup](apps/authup)            | CLI         | A command line interface for interacting with various applications and services within the ecosystem.     |
| [client-web](apps/client-web)    | Application | A web application interface for end users.                                                                |
| [server-core](apps/server-core)  | Service     | A service that forms the backbone of the server-side ecosystem.                                           |

### Packages & Libraries

| Name                                            | Type        | Description                                                                                               |
|-------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------|
| [access](packages/access)                       | Library     | A package for evaluating permissions and policies.                                                        |
| [client-web-kit](packages/client-web-kit)       | Library     | A package containing reusable components, composition aids and utilities for the web application.         |
| [client-web-nuxt](packages/client-web-nuxt)     | Library     | A package for the integration in a nuxt web application.                                                  |
| [core-kit](packages/core-kit)                   | Library     | A package providing functions, interfaces and utilities for the core service.                             |
| [core-http-kit](packages/core-http-kit)         | Library     | A package providing a http client with different sub api clients for resources and workflows.             |
| [core-realtime-kit](packages/core-realtime-kit) | Library     | A package for the core socket service.                                                                    |
| [errors](packages/errors)                       | Library     | A package containing error codes and a basic error class.                                                 |
| [kit](packages/kit)                             | Library     | A package containing general (context independent) utilities.                                             |
| [specs](packages/specs)                         | Library     | A package containing constants, interfaces, utils, ... for different specifications.                      |
| [server-kit](packages/server-kit)               | Library     | A package containing cryptographic algorithms, reusable abstractions for interacting with services, etc.. |

## Architecture

### apps/server-core
The server-core package contains the server-side logic following hexagonal architecture, separating core logic, ports, and adapters.

1. core/ – Domain & Business Logic

The core folder contains the system’s business logic. It defines ports (interfaces) and implements logic for authentication, OAuth2 flows, and identity management.

Examples:

| Folder              | Responsibility                                                                                                                             |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| core/oauth2         | Implements OAuth2 flows (Password, Client Credentials, Refresh Token, etc.). Ports define interfaces for token handling and authorization. |
| core/identity       | Core logic for user and client management, roles, permissions, and policies. Ports define interfaces for entity repositories.              |
| core/authentication | Authentication logic such as password validation                                                                                           |

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

Examples

| Folder                | Responsibility                                                   |
|-----------------------|------------------------------------------------------------------|
| adapters/database     | Database migrations & entities                                   |
| adapters/http         | Controllers, middlewares implementations that use core services. |
| adapters/shared       | Shared adapters such as LDAP                                     |

3. app/modules/ – Orchestration & Bootstrapping

Modules wire together adapters, ports, and core logic. Configure app startup, register adapters, and set up dependency injection.

Examples

| Folder               | Responsibility                                                                                              |
|----------------------|-------------------------------------------------------------------------------------------------------------|
| app/modules/config   | Reads environment variables and configuration files                                                         |
| app/modules/database | Implement repositories based on adapters/database typeorm (entities & repositories), bootstrap connections  |
| app/modules/http     | Configure and initialize controllers with concrete implementations (e.g. also from previous modules)        |


# Key Concepts
- Hexagonal Architecture: logic separated across packages.
- TypeScript & ESM: All packages use TypeScript with strict typing and modern ES module syntax
- Testing: npm run test requires building all packages first (npm run build).
- No explanatory comments unless explicitly requested. Agents should rely on existing patterns and structure.

## Best Practices

- Prefer Web APIs over Node.js-specific APIs where possible.
- Maintain consistency with existing naming and architectural conventions.
- When adding new code, review surrounding code for patterns, types, and design decisions.
- Respect separation of concerns: domain logic → core-kit, API clients → core-http-kit, UI components → client-web-kit.
- Agents can leverage the structured Apps and Packages overview for routing, automation, or code generation.

- Use **ESM** and modern Typescript/JavaScript.
- Use hexagonal architecture if possible.
- Prefer **Web APIs** over Node.js APIs where possible.
- Do not add comments explaining what the line does unless prompted.
- Before adding new code, always study surrounding patterns, naming conventions, and architectural decisions.
