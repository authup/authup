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
- **Errors**: `@authup/errors` provides `AuthupError` (extends `BaseError` from `@ebec/core`) plus dedicated subclasses (`ValidationError`, `EntityNotFoundError`, `EntityConflictError`, `EntityCredentialsInvalidError`, `EntityInactiveError`, `InternalError`, `BadRequestError`, `UnauthorizedError`, etc.) with `Symbol.for(...)`-keyed duck-type guards in sibling `check.ts` files (`isError`, `isAuthupError`, `isValidationError`, `isOAuth2Error`, `isJWTError`, etc.). HTTP-status concern is decoupled — `ERROR_CODE_TO_STATUS` / `httpStatusFromCode(code)` map semantic codes to HTTP statuses in the adapter. **`core/**` must NOT throw HTTP-status-named error classes (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, …) — those names belong to the HTTP layer.** Core throws transport-agnostic domain errors: the generic `ValidationError` (business-rule / bad-input violation, maps to 400), the semantic `Entity*Error` family, or a purpose-built domain error (e.g. `KeyCertificateError`); the HTTP error middleware maps their `code` to a status via `httpStatusFromCode`. `@ebec/http` classes stay in the HTTP middleware for foreign-error translation. Domain-specific identity workflow errors (e.g. `RegistrationDisabledError`, `PasswordRecoveryDisabledError`) live in their respective `core/identity/<workflow>/` folders and extend `ValidationError`.
- **Error helpers**: `normalizeError(unknown): Error` coerces an arbitrary thrown value into a real `Error` for downstream inspection. `serializeError(Error): Record<string, any>` calls `toJSON()` when available (preserving every AuthupError attribute) and otherwise spreads enumerable own properties — use it at any JSON serialization boundary (HTTP error middleware, embedded-error response bodies). Both live in `@authup/errors`.
- **`check` / `safeCheck` pair on services**: When a service exposes a single verification that has two equally-valid call sites — one that wants exceptions (composition, business logic) and one that wants a value (HTTP boundary embedding denial in a response body) — split into two methods: `check(...)` throws on any failure, `safeCheck(...)` wraps `check` and returns `Result<null>` from `@authup/kit`. The HTTP controller calls `safeCheck` and maps `Result` → wire shape via `serializeError`. See `apps/server-core/src/core/identity/{permission,policy}/checker/` for the canonical example.
- **Validation location**: Validators from `@authup/core-kit` (e.g., `RoleValidator`, `UserValidator`) run inside core services, not in controllers. Services receive raw `Record<string, any>` data and call `validator.run(data, { group: ValidatorGroup.CREATE })` internally. Controllers use `useRequestBody(req)` to pass the raw body to the service.
- **Canonical identifier form**: `name` (every entity) and `user.email` are stored as `LOWER(TRIM(value))`. New `name`-style columns must chain `.trim().toLowerCase()` in their validator before the format check, and use `=` (not `LIKE`) in repository lookups. See `.agents/architecture.md#canonical-identifier-form` for the full rationale.
- **Property naming (plan 073)**: new entity/domain properties and management-API payload/response fields must be **camelCase**. On the TypeORM entity, pin the snake_case column explicitly — `@Column({ name: 'snake_col' })` on every camelCase property, `@JoinColumn({ name })` on every relation (there is no naming strategy; a forgotten `name` yields a camelCase column that diverges from the frozen migration, so always add it). The OAuth2/OIDC protocol surface and JWT claims stay snake_case. See `.agents/architecture.md#naming-split-plan-073`.
- **Relation targets**: when copying a `@ManyToOne` + `@JoinColumn` block (the usual way a new relation is written), re-check the target class against the join column — `@ManyToOne(() => RealmEntity)` left on a `client_id` column emits an FK to `auth_realms`, so the column can never hold a real client id. This has slipped through twice (`auth_permissions.client_id`, fixed in migration `1766830857009`; `auth_roles.client_id`, fixed in `1784970000000`) because TypeORM derives the FK name from the table + column only, so the name looks right either way and nothing fails until a row is written. Verify a migrated schema against the entity metadata with `dataSource.driver.createSchemaBuilder().log()` — an FK drop/add pair for the table means the two disagree.

## Workflow

- After making changes, **always build** the affected app/package and **run ESLint** on all changed files.
- Build: `npm run build -w <workspace>` (from repo root, e.g. `-w apps/server-core`, `-w packages/kit`)
- Lint: `npx eslint --fix path/to/changed/file1.ts path/to/changed/file2.ts`
- Fix any build or lint errors before considering a task complete.

## Testing

- **Service-level tests** isolate domain logic with in-memory fakes. Generic fakes (`FakeEntityRepository`, `FakePermissionEvaluator`, `createAllowAllActor()` etc.) come from `@authup/server-test-kit`; domain fakes (`FakeRealmRepository`, `FakeRoleRepository`, `FakeUserRepository`, ...) live alongside their entity at `test/unit/core/entities/<entity>/fake-repository.ts`. No HTTP, no Docker.
- **HTTP-level tests** spin up the real server on a random port. Use `suite.client` (typed `@authup/core-http-kit` Client) for API calls; `suite.baseURL` for raw `fetch()` (e.g., asserting HTML response bodies).
- **UI/SSR tests** stub the rendered Vue app's outbound HTTP via a fake client: register `{ useFactory: () => createFakeClient(handlers) }` (from `@authup/core-http-kit/testing`) with `{ lifetime: 'transient' }` under `HTTPInjectionKey.UIHttpClient` before `suite.setup()` (see `.agents/testing.md`). Transient lifetime — never a singleton instance — because the client carries per-user Authorization state. Production code never imports from `@authup/core-http-kit/testing`.

## Database Migrations

Migrations live in `apps/server-core/src/adapters/database/migrations/{mysql,postgres}/` (sqlite never runs them — the options builder wires `migrations: []` for `better-sqlite3`, so boot falls back to `dataSource.synchronize()` from the entity classes; the test suite does the same).

- **One named migration per feature; released migrations are immutable.** Each feature/PR adds its own migration with a descriptive class/file name (e.g. `1784289540000-CamelCaseAttributes.ts`, `1784460916000-RemoveRobots.ts`; both dialects, doc-comment header explaining the change). A migration may still be amended while it lives only on its own unmerged branch; once it ships in a **release** it is immutable — before touching an existing migration, verify against the release tags / last release-PR merge that it has not shipped (folding into an already-released file is the failure mode this rule exists to prevent).
- Consolidation happens at release time, not at merge time: the window's migrations MAY be squashed into one file per dialect as a deliberate last step before the release PR merges (keeping the earliest timestamp so ordering against the released chain holds) — but this is optional; shipping several named migrations in one release is fine. Anyone who executed the pre-squash files must drop their dev DB (the CLI re-creates it) or fix its `migrations` table by hand.
- After adding or amending a migration, verify with the migration round-trip (`migration run` → `revert` × N → `run`, see [testing.md](testing.md#migration-tests)).
- Planned for `v1.0.0` final: squash the entire beta chain into a single baseline migration with a stepping-stone upgrade path (upgrade to the last beta first).

## File Organization

- Exported **types** (interfaces, type aliases) must live in a `types.ts` file in the same directory, not inline in the implementation module. Implementation files import from `types.ts`.
- Barrel `index.ts` files re-export from `types.ts` and implementation modules.

## Dependency Classification (published packages)

Sort each runtime dependency of a **published** package by one question: **would a second copy in the consumer's tree be a bug?**

- **`peerDependencies` (+ a devDependency mirror)** — only for **singletons**: something a *second instance* would break, or that the consuming app *owns and configures*. Framework runtimes (`vue`, `pinia`), a plugin/theme manager registered via `app.use()` (`@vuecs/core` and the `@vuecs/*` components bound to it — peer even when the kit's own import is `import type`, because the runtime singleton flows through the components), and `provide`/`inject` clusters keyed by a module-local `Symbol()` (`validup`/`@validup/vue`, `ilingo`/`@ilingo/vue`/`@ilingo/validup-vue`). Here `dependencies` would be *wrong*, not just wasteful — a private nested copy silently splits the singleton. The dev mirror lets the package build/test in isolation; keep peer range and dev pin aligned (peer = caret on the dev pin).
- **`dependencies`** — runtime-required **stateless leaves** with no singleton semantics: pure functions/enums/classes the package instantiates internally and never shares by identity (`smob`, `rapiq`, `@posva/event-emitter`, `@validup/zod`, `@ilingo/validup`, and the internal `@authup/*` building blocks — the package constructs its own `PermissionEvaluator`/`Client`/`ClientManager`, so there is no host-owned instance to dedupe). One version is still guaranteed by lockstep release + resolver dedup; `dependencies` just spares the consumer a manual install. This matches the `@authup/core-kit` / `@authup/client-web-nuxt` precedent (internal `@authup/*` as plain `dependencies`, never peers). **"Needed at runtime" does NOT imply peer.** A phantom runtime need (a package used only transitively, e.g. `universal-cookie` via `@vueuse/integrations/useCookies`) is still declared here.
- **`peerDependenciesMeta` `optional: true`** — a singleton needed only on an opt-in path that degrades gracefully (`@vuecs/locale`: `tryUseLocaleManager()` falls back to the ilingo locale).
- **`devDependencies` only** — build/test tooling (`@types/node`, `@vitejs/plugin-vue`, `vue-tsc`, `cross-env`), plus packages referenced **only** in `test/` or internal build code that never surface in the emitted `.d.ts`.

**`import type` is NOT automatically `devDependencies`.** A type-only import erases from the emitted JS, but if the type is **re-exposed in the package's public `.d.ts`** — as the return / parameter / field type of a public export, a re-exported type, or a `declare module '<pkg>'` augmentation — then a *consumer* compiling against that `.d.ts` must resolve the package, so it belongs in `dependencies` (stateless leaf: `rapiq`'s `PaginationParseOutput` re-exposed by `server-kit`, `@authup/server-kit`'s `ActorContext` / `IEntityRepository` re-exposed by `server-test-kit`'s fakes) or `peerDependencies` (a singleton, or an augmentation of the consumer's own copy: `validup` in `i18n`, whose `declare module 'validup'` block augments the consumer's validup — optional, since it only matters when that feature is used). Only a type used **purely internally** (never in the emitted `.d.ts`) may be `devDependencies`-only. The monorepo build does **not** catch this — the demoted package is still hoisted for the workspace; verify per package with `rg '<pkg>' dist/**/*.d.ts` after building.

Do **not** use `peerDependencies` as a blanket "dedup enforcer" on leaves — dedup is free and applies to `dependencies` too; peer's only unique power (forbid a private nested copy, fail loud on conflict) matters solely for singletons. Before deleting or demoting an entry, verify actual usage (`rg "from '<pkg>'" src`, check `dist`, and check whether a *lower* package peers it — e.g. `socket.io-client` is a peer of `@authup/core-realtime-kit` and is statically imported by its `ClientManager`, so `@authup/client-web-kit` must keep declaring it even though its own `src` never imports it).

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

## Upstream (Own) Libraries

Most non-framework dependencies are maintained by the same author (tada5hi) and can be
changed easily: `rapiq` (`@rapiq/*`), `vuecs` (`@vuecs/*`), `validup` (`@validup/*`),
`ilingo` (`@ilingo/*`), `routup` (`@routup/*`), `hapic` (`@hapic/*`), `ebec` (`@ebec/*`),
`typeorm-extension`, `smob`, `locter` — each lives at `github.com/tada5hi/<name>`.

- **When authup work reveals a gap, bug, or awkward API in one of these, open an issue in
  the upstream repo** (`gh issue create --repo tada5hi/<name>`) describing the authup use
  case — do NOT silently build an authup-side workaround. Workarounds calcify; upstream
  changes are cheap here. Precedents: tada5hi/rapiq#790 (TS2590), #800
  (`assertSchemaMatchesEntity`), #806 (context RFC), #811 (public-IR negation);
  tada5hi/vuecs#1591 (theme-manager merge), #1601 (generic `VCTable`), #1689 (Reka
  trigger-label snapshot).
- **rapiq is experimental** — big breaking changes are still expected and welcome; authup
  is the driving consumer, so gaps found during authup work should shape rapiq's design
  now while breakage is cheap.
- A deliberate authup-side fallback while an upstream issue is open is fine (e.g. keeping
  `invert: true` policies as post-checks until rapiq#811) — but the issue must exist so
  the fallback has a removal trigger.
- When upstream code is consulted, also update the corresponding mapping file under
  `.agents/references/` (see below).

## References

External project references live in `.agents/references/` — one Markdown file per external project
this codebase cross-references, building a **cumulative code mapping** so future work can find
corresponding code without re-searching. When looking up source code or docs in a referenced
project, update the corresponding reference file with:

- The source file path / function name (or doc/release anchor) in the external project
- The corresponding file path / function name in this project
- Any behavioral differences between the implementations (pin claims to a release version)

Current references:

- [authentik.md](references/authentik.md) — Authentik (goauthentik.io): the concept→authup mapping
  behind the competitive-parity roadmap (`.agents/plans/048-authentik-parity-overview.md`),
  release-verified through Authentik 2026.5.

## Best Practices

- Use **ESM** and modern TypeScript/JavaScript.
- Prefer **Web APIs** over Node.js-specific APIs where possible.
- Use hexagonal architecture if possible.
- Maintain consistency with existing naming and architectural conventions.
- Before adding new code, always study surrounding patterns, naming conventions, and architectural decisions.
- Respect separation of concerns: domain logic → core-kit, API clients → core-http-kit, UI components → client-web-kit.
- No explanatory comments unless explicitly requested. Agents should rely on existing patterns and structure.
- Use domain interfaces (from core-kit) in ports, TypeORM entity classes only in adapters.
