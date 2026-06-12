# Conventions

## Tooling

| Tool             | Purpose                                           |
|------------------|---------------------------------------------------|
| NX               | Monorepo task runner (dependency-ordered builds)   |
| tsdown           | Package JS bundling (rolldown-based)               |
| Vite             | server-core embedded UI builds (`apps/server-core/ui/`) |
| Nuxt             | client-web builds                                 |
| Vitest + SWC     | Test runner with fast compilation                  |
| ESLint           | Linting (`@tada5hi/eslint-config-vue-typescript`) |
| Husky            | Pre-commit hooks via lint-staged                   |
| commitlint       | Commit message convention enforcement              |

## Validation & Error Handling

- **Validation**: `validup` framework with `@validup/adapter-zod` for Zod schema integration
- **Errors**: `@authup/errors` provides `AuthupError` (extends `BaseError` from `@ebec/core`) plus dedicated subclasses (`BadRequestError`, `UnauthorizedError`, `EntityNotFoundError`, `EntityConflictError`, `InternalError`, etc.) with `Symbol.for(...)`-keyed duck-type guards in sibling `check.ts` files (`isError`, `isAuthupError`, `isOAuth2Error`, `isJWTError`, etc.). HTTP-status concern is decoupled — `ERROR_CODE_TO_STATUS` / `httpStatusFromCode(code)` map semantic codes to HTTP statuses in the adapter. **Core/domain code throws only `AuthupError` (or subclasses); `@ebec/http` classes are confined to the HTTP middleware for foreign-error translation.** Domain-specific identity workflow errors (e.g. `RegistrationDisabledError`, `PasswordRecoveryDisabledError`) live in their respective `core/identity/<workflow>/` folders.
- **Error helpers**: `normalizeError(unknown): Error` coerces an arbitrary thrown value into a real `Error` for downstream inspection. `serializeError(Error): Record<string, any>` calls `toJSON()` when available (preserving every AuthupError attribute) and otherwise spreads enumerable own properties — use it at any JSON serialization boundary (HTTP error middleware, embedded-error response bodies). Both live in `@authup/errors`.
- **`check` / `safeCheck` pair on services**: When a service exposes a single verification that has two equally-valid call sites — one that wants exceptions (composition, business logic) and one that wants a value (HTTP boundary embedding denial in a response body) — split into two methods: `check(...)` throws on any failure, `safeCheck(...)` wraps `check` and returns `Result<null>` from `@authup/kit`. The HTTP controller calls `safeCheck` and maps `Result` → wire shape via `serializeError`. See `apps/server-core/src/core/identity/{permission,policy}/checker/` for the canonical example.
- **Validation location**: Validators from `@authup/core-kit` (e.g., `RoleValidator`, `UserValidator`) run inside core services, not in controllers. Services receive raw `Record<string, any>` data and call `validator.run(data, { group: ValidatorGroup.CREATE })` internally. Controllers use `useRequestBody(req)` to pass the raw body to the service.
- **Canonical identifier form**: `name` (every entity) and `user.email` are stored as `LOWER(TRIM(value))`. New `name`-style columns must chain `.trim().toLowerCase()` in their validator before the format check, and use `=` (not `LIKE`) in repository lookups. See `.agents/architecture.md#canonical-identifier-form` for the full rationale.

## Workflow

- After making changes, **always build** the affected app/package and **run ESLint** on all changed files.
- Build: `npm run build -w <workspace>` (from repo root, e.g. `-w apps/server-core`, `-w packages/kit`)
- Lint: `npx eslint --fix path/to/changed/file1.ts path/to/changed/file2.ts`
- Fix any build or lint errors before considering a task complete.

## Testing

- **Service-level tests** isolate domain logic with in-memory fakes. Generic fakes (`FakeEntityRepository`, `FakePermissionEvaluator`, `createAllowAllActor()` etc.) come from `@authup/server-test-kit`; domain fakes (`FakeRealmRepository`, `FakeRoleRepository`, `FakeUserRepository`, ...) live alongside their entity at `test/unit/core/entities/<entity>/fake-repository.ts`. No HTTP, no Docker.
- **HTTP-level tests** spin up the real server on a random port. Use `suite.client` (typed `@authup/core-http-kit` Client) for API calls; `suite.baseURL` for raw `fetch()` (e.g., asserting HTML response bodies).
- **UI/SSR tests** stub the rendered Vue app's outbound HTTP via a fake client: register a per-request factory (`{ useValue: () => createFakeClient(handlers) }` from `@authup/core-http-kit/testing`) under `HTTPInjectionKey.UIHttpClientFactory` before `suite.setup()` (see `.agents/testing.md`). A factory — never a shared instance — because the client carries per-user Authorization state. Production code never imports from `@authup/core-http-kit/testing`.

## File Organization

- Exported **types** (interfaces, type aliases) must live in a `types.ts` file in the same directory, not inline in the implementation module. Implementation files import from `types.ts`.
- Barrel `index.ts` files re-export from `types.ts` and implementation modules.

## Interfaces & Types

- **Every interface is prefixed with `I`**: `IEntityAPI`, `IClient`, `IRealmAPI`, `IEntityRepository`, `IDomainEventHandler`.
- **`interface` is reserved for contracts a class `implements`.** Anything not class-implemented (object shapes, options bags, payloads, structural contracts satisfied only implicitly — e.g. a third-party class matching a transport surface) is a `type` alias.
- **Contract-first, never implementation-inferred**: define the interface explicitly and have the class `implements` it. Do not derive public types from classes (no `typeof Client` / mapped-over-class "public interface" tricks) — the only sanctioned exception is at a third-party boundary where authup cannot make the dependency's class implement an authup interface.
- Interfaces must state **precise payload types** (e.g. `create(data: RealmCreatePayload)`), not weakened supertypes like `Partial<T>` that implementations silently narrow.

## Configuration Naming

- Boolean feature toggles use the `Enabled` suffix: `registrationEnabled`, `passwordRecoveryEnabled`, `emailVerificationEnabled`
- Config keys in `app/modules/config/types.ts` match the service option names
- Environment variable names use `SCREAMING_SNAKE_CASE` with `_ENABLED` suffix: `REGISTRATION_ENABLED`, `PASSWORD_RECOVERY_ENABLED`, `EMAIL_VERIFICATION_ENABLED`
- Config file keys (`.conf`) use `camelCase` matching the TypeScript property name

## Best Practices

- Use **ESM** and modern TypeScript/JavaScript.
- Prefer **Web APIs** over Node.js-specific APIs where possible.
- Use hexagonal architecture if possible.
- Maintain consistency with existing naming and architectural conventions.
- Before adding new code, always study surrounding patterns, naming conventions, and architectural decisions.
- Respect separation of concerns: domain logic → core-kit, API clients → core-http-kit, UI components → client-web-kit.
- No explanatory comments unless explicitly requested. Agents should rely on existing patterns and structure.
- Use domain interfaces (from core-kit) in ports, TypeORM entity classes only in adapters.
