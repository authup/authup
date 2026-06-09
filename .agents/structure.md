# Project Structure

The project is a monorepo using TypeScript and ESM modules.
It follows hexagonal architecture principles, separating core business logic, adapters, and interfaces.

## Applications

| Name                                      | Type        | Description                                                                                           |
|-------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------|
| [authup](../apps/authup)                  | CLI         | A command line interface for interacting with various applications and services within the ecosystem. |
| [client-web](../apps/client-web)          | Application | A Nuxt-based web application interface for end users.                                                 |
| [server-core](../apps/server-core)        | Service     | A service that forms the backbone of the server-side ecosystem. Embeds a Vite-built Vue 3 consent UI for the OAuth2 `/authorize` endpoint under `ui/`, emitted to `dist/ui/` at build time. |

## Packages & Libraries

| Name                                            | Type        | Description                                                                                               |
|-------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------|
| [access](../packages/access)                    | Library     | A package for evaluating permissions and policies.                                                        |
| [client-web-kit](../packages/client-web-kit)    | Library     | A package containing reusable components, composition aids and utilities for the web application.         |
| [client-web-kit-theme](../packages/client-web-kit-theme)| Library | Kit-level vuecs theme — composes `@vuecs/theme-tailwind` with the element overrides `@authup/client-web-kit`'s components need. |
| [client-web-nuxt](../packages/client-web-nuxt)  | Library     | A package for the integration in a nuxt web application.                                                  |
| [client-web-theme](../packages/client-web-theme)| Library     | Authup app theme for vuecs components, built on `@vuecs/theme-tailwind` (extends `@authup/client-web-kit-theme`). Ships a single CSS entry (`@authup/client-web-theme/index.css`) consumed by the apps. |
| [core-kit](../packages/core-kit)                | Library     | A package providing functions, interfaces and utilities for the core service.                             |
| [core-http-kit](../packages/core-http-kit)      | Library     | A package providing a http client with different sub api clients for resources and workflows.             |
| [core-realtime-kit](../packages/core-realtime-kit)| Library   | A package for the core socket service.                                                                    |
| [errors](../packages/errors)                    | Library     | `AuthupError` (extends `BaseError` from `@ebec/core`), error-code constants, built-in subclasses (`BadRequestError`, `EntityNotFoundError`, ...), code→HTTP-status mapping, and `Symbol.for(...)`-keyed duck guards. |
| [i18n](../packages/i18n)                        | Library     | Framework-agnostic translation catalogs + locale registry. `CATALOGS` is an ilingo `CatalogNode` (built via ilingo's `defineCatalog`/`defineLocale`/`defineNamespace`/`defineTranslations` helpers, locale → namespace → translations) consumed directly by `MemoryStore({ data: CATALOGS })`. Also exports namespace/key enums (`TranslatorTranslation*`), `LOCALES`/`LocaleCode`/`DEFAULT_LOCALE`/`isLocale`, the `NamespaceTranslations<K>` mapped type for compile-time key completeness, and the `authupError` namespace mapping `@authup/errors` `ErrorCode`s to localized messages (B1: validup-issue-shaped, `IssueDataByCode`-augmented). **Generic UI vocabulary is split across four namespaces** — `ENTITY` (`authupEntity`), `FIELD` (`authupField`), `ACTION` (`authupAction`), `COMMON` (`authupCommon`); every `TranslatorTranslationNamespace` value carries an `authup` prefix (e.g. `ENTITY = 'authupEntity'`, matching the pre-existing `ERROR = 'authupError'`) so a host app embedding `client-web-kit` can't collide with its own catalogs. Per-locale catalog modules mirror the split one-file-per-namespace (`catalogs/{en,de,fr,es}/{entity,field,action,common,client,app,error,vuecs}.ts`; the old `default.ts` is gone). All four locales in `LOCALES` (`en`, `de`, `fr`, `es`) are fully authored in `CATALOGS`; the locale-parity test enforces exact per-namespace key parity across every authored locale, and the `LanguageSwitcherDropdown` UI iterates `LOCALES` (rendering each `nativeName`) so adding a locale to the registry surfaces it in the switcher automatically. **Entity nouns are ilingo plural nodes** (`definePlural({ one, other })` under `authupEntity`): the call site selects the form via `count` (`count: 1` → singular, any other → plural) instead of a separate `*S` key. Pure data, zero Vue; consumed by `client-web-kit`'s ilingo install. |
| [kit](../packages/kit)                          | Library     | A package containing general (context independent) utilities.                                             |
| [specs](../packages/specs)                      | Library     | A package containing constants, interfaces, utils, ... for different specifications.                      |
| [server-adapter-kit](../packages/server-adapter-kit)| Library   | Core token verification logic, caching, and shared types for server adapters.                             |
| [server-adapter-node](../packages/server-adapter-node)| Library | A Node `IncomingMessage` middleware adapter for token verification.                                       |
| [server-adapter-socket-io](../packages/server-adapter-socket-io)| Library | A socket.io middleware adapter for token verification.                                                |
| [server-adapter-web](../packages/server-adapter-web)| Library   | A transport-neutral Web `Request` adapter primitive for token verification.                                |
| [server-kit](../packages/server-kit)            | Library     | Cryptographic algorithms, shared server-side primitives (`IEntityRepository`, `ActorContext`, `AbstractEntityService`), and reusable abstractions for interacting with services. |
| [server-test-kit](../packages/server-test-kit)  | Library     | Generic server-side test fakes (`FakeEntityRepository`, `FakePermissionEvaluator`, actor factories). devDep-only; consumed by `apps/server-core`'s test suite and any future server-side app's tests. |

## Package Dependency Layers

Changes to a lower-layer package affect all packages above it. Build order follows these layers.
Internal `@authup/*` dependencies are declared in each package's `package.json` (dependencies, devDependencies, peerDependencies) — always consult those for the authoritative dependency graph.

```
Foundation (no internal @authup deps):
  kit, errors

Layer 1:
  specs             → kit, errors
  core-realtime-kit → kit
  i18n              → errors (+ ilingo runtime dep; validup & @authup/errors are peer + dev only)

Layer 2:
  access            → kit, errors
  core-kit          → kit, errors, specs
  server-kit        → access, core-kit, kit, errors, specs, core-realtime-kit (+ rapiq peer)

Layer 3:
  core-http-kit     → access, errors, kit, core-kit, specs
  server-adapter-kit → kit, errors, specs, core-kit, core-http-kit, server-kit
  server-test-kit   → access, core-kit, kit, server-kit (devDep-only consumers)

Layer 4:
  server-adapter-node      → server-adapter-kit
  server-adapter-socket-io → core-kit, server-adapter-kit
  server-adapter-web       → errors, server-adapter-kit

Application libraries:
  client-web-kit    → access, kit, core-kit, core-http-kit, core-realtime-kit, errors, i18n, specs
  client-web-nuxt   → access, kit, client-web-kit

Apps:
  server-core       → access, kit, core-kit, core-http-kit, errors, server-kit, specs
                      (embedded consent UI under ui/ uses client-web-kit, kit, core-kit, core-http-kit — build-time only)
  client-web        → client-web-kit, kit, core-kit, core-http-kit, client-web-nuxt
  authup (CLI)      → client-web, kit, core-kit, server-core
```

## Separation of Concerns

- **Domain logic** → core-kit
- **API clients** → core-http-kit
- **UI components** → client-web-kit

## UI Stack (`apps/client-web`, `apps/server-core/ui`, `packages/client-web-kit`)

| Layer | Package(s) | Notes |
|---|---|---|
| **Theming** | `@vuecs/core` (3.x) + `@vuecs/theme-tailwind` (3.x) via `@authup/client-web-theme` | Theme manager + Tailwind v4 class strings. `@authup/client-web-theme` composes `tailwindTheme()` and ships a single CSS entry (`@authup/client-web-theme/index.css`) that pulls in `tailwindcss`, `@vuecs/design` (OKLCH semantic tokens), `@vuecs/theme-tailwind` (Tailwind ↔ vc-color rebind), and a small Bootstrap-compat `@layer components` block (`.btn`, `.row`/`.col`, `.alert`, `.badge`, `.nav`/`.navbar`, `.modal-*`, `.fade`) that `@apply`s Tailwind utilities under the legacy Bootstrap class names so authup's pre-Tailwind markup keeps rendering. The compat layer is transitional; it shrinks as call sites migrate to `<VCButton>` / `<VCAlert>` / `<VCBadge>` / etc. |
| **Icons** | `@vuecs/icon` + `@vuecs/icons-font-awesome` | Iconify-backed `<VCIcon>` + the FA Solid name preset. Old `fa-solid fa-X` CSS class strings on plain `<i>` are still in use for legacy templates — both paths coexist. |
| **Form controls** | `@vuecs/forms` (4.x) | `<VCFormGroup>` / `<VCFormInput>` / `<VCFormTextarea>` / `<VCFormCheckbox>` / `<VCFormSelect>`. Authup uses these via the `buildForm*` shim in `packages/client-web-kit/src/core/form/builders.ts` — render-function builders that wrap the SFCs and preserve the legacy `{ value, onChange, props, class }` shape. Entity **name** fields use `<ANameInput>` (`packages/client-web-kit/src/components/utility/ANameInput.vue`) instead of a bare `<VCFormInput>`: it wraps `VCFormInput` with a "regenerate" button rendered in the `#groupAppend` input-group slot that emits a slug-safe `generateName()` (from `@authup/kit`) through the normal `update:modelValue` channel. Drop-in for `v-model` / `:model-value` + `@update:model-value`; pass `:disabled` for built-in / name-locked / master entities (the append button is then omitted). Entity **secret** fields (client, robot) use the sibling `<ASecretInput>` (`packages/client-web-kit/src/components/utility/ASecretInput.vue`), same `#groupAppend` regenerate layout but emitting a crypto-strong `generateSecret()` (from `@authup/kit`). **SSR-safety contract for generated defaults:** `generateName(seed?)` accepts an optional seed — entity forms pass Vue's hydration-stable `useId()` so the prefilled name matches across the SSR and client render passes (no hydration mismatch). `generateSecret()` deliberately takes **no** seed (a secret must not be derived from a predictable value); forms therefore generate the initial secret client-side only, inside `onMounted`, leaving the field empty during SSR. Both are captured once in `setup` (`const nameSeed = useId()`), never inside a function re-invoked later. |
| **List rendering** | `@vuecs/list` (1.x) | Compound `<VCList>` / `<VCListBody>` / `<VCListItem>` / `<VCListLoading>` / `<VCListEmpty>`. `defineEntityCollectionManager`'s renderer in `client-web-kit/src/components/utility/entity/collection/module.ts` composes these directly. |
| **Tables** | `@vuecs/table` (≥ 1.1.1) | `<VCTable>` directly. `:data` + `:columns` (`TableColumn[]`) drives auto-render; consumer-side `#cell-<key>` / `#header-<key>` slot templates are dispatched onto each cell by `composeTableInner` (tada5hi/vuecs#1592). Centered headers use plain `headerClass: 'text-center'` — `clientWebTheme()` overrides `tableHeadCell.classes.root` to drop theme-tailwind's baked `text-left`, so consumer alignment classes win without Tailwind v4's `!important` suffix. Cells follow the same shape via `cellClass`. |
| **Pagination** | `@vuecs/pagination` (2.x) via `buildPagination` wrapper | `client-web-kit/src/components/utility/pagination/module.ts` converts the legacy `{ load, meta, busy }` shape to `<VCPagination>`'s `update:page` event. |
| **Overlays** | `@vuecs/overlays` (1.x) | `<VCToaster>` mounted in `apps/client-web/components/footer.vue`; `useToast()` shimmed in `apps/client-web/composables/toast.ts` to preserve the bvnext-style `toast.show(string \| { variant, body })` call surface. `<VCDropdownMenuItem>` resolved opportunistically in `<AEntityDelete>` (replaces the bvnext `BDropdownItem` fallback). |
| **Other** | `@vuecs/{button, elements, countdown, timeago, navigation}` | Each used via its globally-registered `<VC*>` components after `app.use(installX)`. |

### Plugin install order — important

`@vuecs/core` ≥ 3.1.0 (`installThemeManager`) now **merges install
options into the existing manager** rather than dropping them on second
install (see tada5hi/vuecs#1591). So the previous "first-install-wins"
trap is gone: if a per-package plugin (`installForms`,
`installPagination`, ...) runs before the consumer's
`app.use(vuecs, { themes: [...], icons: [...] })`, the second call still
merges the themes / icons into the already-created manager. Form fields
no longer render unstyled just because the install order shifted.

Even so, **keep the explicit ordering**:

- Consumer app's `vuecs` plugin retains `name: 'vuecs'` in
  `apps/client-web/plugins/vuecs.ts` so other Nuxt plugins that touch
  vuecs APIs directly (e.g. `vuecs-navigation.ts` calling
  `@vuecs/navigation`'s `install()`) can `dependsOn: ['vuecs']`.
- `packages/client-web-kit/src/module.ts` still deliberately does NOT
  install `@vuecs/forms` or `@vuecs/pagination` — both are installed by
  the consumer app, where it's clear they get the full theme config.
- The trap is defused, not removed: a malformed sequence where the
  consumer never calls `app.use(vuecs, ...)` at all still leaves the
  manager with whatever empty-config per-package installs first set up.
  An explicit `app.use(vuecs, { themes, icons, defaults })` somewhere in
  the boot chain is still required for the app to actually pick up
  authup's theme overrides.

The `vuecs` plugin in `apps/client-web/plugins/vuecs.ts` declares
`name: 'vuecs'` precisely so other plugins can depend on it. Don't
remove that name.

`packages/client-web-kit/src/module.ts` deliberately does NOT install
`@vuecs/forms` or `@vuecs/pagination` — both are installed by the
consumer app's plugin file (`apps/client-web/plugins/vuecs.ts` and
`apps/server-core/ui/src/app.ts`), AFTER `app.use(vuecs, ...)`.

The client-web Nuxt plugin declares `dependsOn: ['authup:kit']` so it
runs AFTER `@authup/client-web-nuxt`'s kit plugin. The kit plugin's
`install()` calls `installTranslator()` which provides the ilingo
locale via `app.provide(LocaleSymbol, ...)`; the vuecs plugin's
`injectTranslatorLocale()` (used to sync the timeago locale) reads
that symbol back. Using `enforce: 'pre'` here would invert the order
and make `injectLocale()` throw — that throw aborts the plugin chain
before `@pinia/nuxt`'s setup runs, and the pinia plugin's
already-registered `app:rendered` hook then reads `nuxtApp.$pinia` as
undefined and fails SSR with a misleading "Cannot read properties of
undefined (reading 'state')". The kit's `install()` only registers
`app.component(...)`s (it does not render them), so installing the
vuecs theme manager afterwards is still in time for the first page
render.
