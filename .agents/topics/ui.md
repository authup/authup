# UI layer (kit store, SFC integration, Tailwind)

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## UI Layer (`apps/client-admin-console`, `apps/client-auth-console`, `packages/client-web-kit`)

The UI sits on the `@vuecs/*` 1.x line: see
[structure.md](../structure.md) → *UI Stack*
for the package matrix. Two architectural notes specific to authup's
integration are worth knowing before editing UI code:

### What the kit store persists (and what it deliberately does not)

The store's cookies are the SSR transport, not a storage preference: a Nuxt
consumer on `@authup/client-web-nuxt` (hub) reads them server-side (the kit plugin wires `cookieGet` to Nuxt's
`useCookie`, which parses the request header), so its routing interceptor can
await `store.resolve()` during the render. The auth console's server render
reads the access token alone, handed over by its service, and writes nothing
(see *Auth Workflow UI*); the account and admin consoles never server-render, and served
by server-core they hold no token cookies at all (cookie mode). `localStorage`
cannot replace any of this, because the server never sees it.

Persisted: the three tokens, the access-token expire date, and
`realm_management`. Everything else is derived by `resolve()`, which
introspects on every store instantiation regardless. Every write carries
`SameSite=Lax`, and `Secure` whenever the request is https, since the values
are bearer credentials. `installStore` asks `window.location` unless the host
passes `cookieSecure`, which a server-side writer must: a render has no
document, and the Nuxt interceptor's refresh during SSR rotates the refresh
token, so a write without the flag would replace the `Secure` cookie for as
long as the token lives. The Nuxt plugin passes `useRequestURL()`'s scheme,
which h3 reads from `X-Forwarded-Proto` behind a proxy. Its `cookieSet`
spreads the host's own cookie options last, so they win over the kit's. HSTS
is the proxy's job and documented as such.

**A session is only committed for a token the endpoint reports as
`active`.** The introspection answers 200 with the full payload for a token it
will not honour - revoked, or past its expiry - so reading the claims alone
committed a dead token as a live session: identity set, permissions set,
`validated` true, right up until the next protected call 401'd (issue #3487
finding 2). The check lives in the single fetcher, `fetchTokenIntrospection`,
and REJECTS rather than returning a flag, so both staging sites take the path
they already have for an introspection that failed outright: a stale restore
falls through to `refreshSession()` (an access token revoked on its own is
legitimately recoverable), and a fresh grant reverts and revokes what it
staged. Deliberately NOT a `commitSession()` guard - that is the synchronous
write path whose boolean drives the generation check, and a `false` there would
leave a live-looking token with a null user. An inactive response still carries the
subject's claims for an expired token, but never `permissions` (the server
withholds them before loading grants), and the store rejects every response
whose `active` is false before committing anything from it. This is coupled to
the introspection endpoint (conventions.md -> *`POST /token/introspect`
REPORTS, it does not raise*): an EXPIRED token answers 200
`{active: false}` rather than throwing, so a store relying on a throw to reach
its refresh fallback would never reach it. The two must not be separated.

**The user is derived from the introspection, not fetched.** `postIntrospect`
resolves the token's subject server-side and spreads its OpenID claims into the
response (`OAuth2OpenIDClaimsBuilder`: `name`, `email`, and `displayName` under
`nickname` / `preferred_username`), so `store.user` is built from a response the
store already awaits. It is typed to what a consumer renders,
`Pick<User, 'id' | 'name' | 'displayName' | 'email'>`: the id every owner-scoped
query filters on, the account chip's and the authorize page's "continue as"
label, and the address an avatar hash is derived from. The one surface that
needs the whole record, the account console's profile form, loads it itself,
from `/userinfo` rather than `/users/@me`, because `email` is `select: false`
and therefore absent from the entity endpoint's default projection.

**`email` is in the pick because dropping a claim already on the wire fails
silently** (issue #3506). Gravatar keys an avatar on `md5(trim(lower(email)))`,
so a consumer without the address cannot render one at all, and substituting
any other stable string still answers 200, since the default `d=` generates a
fallback image from whatever hash it is given: the page looks right and shows
the wrong person. Recovering it by re-introspecting per render repeats the
round-trip this shape exists to remove. It is not the `user` COOKIE coming
back. That was an unbounded record (`extendOneWithEA` flattens every user
attribute onto `/userinfo` after the projection) riding the Cookie header on
every request to the origin, static assets included. The address is not new to
the browser either: the id_token spreads the SAME claims
(`OAuth2OpenIDTokenIssuer.issueWithIdentity`) and the kit persists it under
`CookieName.ID_TOKEN`, so in bearer mode the email already rides that header,
base64-decodable, on every same-path request. What the ref adds on the wire is
nothing, and for a Nuxt consumer one more field in an SSR payload that already
carries the access and refresh tokens off the same store.

**`UserMinimal` is declared once and re-picked at two sinks.** The alias, and
`RealmMinimal` beside it, lives in `core/store/types.ts` and is imported by
`core/store/create.ts` and `core/store/dispatcher/types.ts`, so widening the
pick reaches the refs and the `USER_UPDATED` payload type in one edit.
`buildUser` returns the shape and `setUser` re-picks it again at the sink,
deliberately (callers hand over whole entity rows, and the ref is what a Nuxt
consumer's SSR payload carries). Both are contextually typed against the alias
and a pure `Pick` makes every member required, so omitting a newly picked field
at either site is a compile error, TS2741 in `buildUser` and TS2322 at the sink,
never a silent drop. Note the guard is `build:types` alone: vitest transpiles
through SWC, so the suite runs an un-type-checked tree and reports the omission
as a runtime absence instead. The DECLARATION carried no such guard until issue
#3520: it was spelled independently in both files with nothing tying the two
together, so widening one and leaving the other narrow compiled clean and the
dispatcher payload type silently understated what was emitted. Sharing it
publishes it through the store barrel, which is not the cost it reads as: that
barrel already re-exports `create.ts` wholesale, so an alias exported from
either file lands in the package's public `.d.ts` just the same.

The server half is droppable once per SURFACE. The claim maps from a
`select: false` column that survives only because `UserIdentityRepository.find()`
re-selects every one of them, and each endpoint then spreads the claims itself,
so both spreads are pinned: `introspect.spec.ts` for `POST /token/introspect`
and `console-session.spec.ts` for `GET /sessions/@me/introspect`, the one a
cookie-mode console hydrates from.

The claims are read straight off `OAuth2TokenIntrospectionResponse`, which
declares them (`OpenIDClaims` in `@authup/specs`, the OIDC Core 5.1 set,
intersected by both that response and `OpenIDTokenPayload`). A local
`SubjectClaims` alias stood here until #3518 because the two sides disagreed
about NULL: the endpoint mapped entity columns onto claim names and passed a
nullable one straight through, so a user without a display name answered
`nickname: null`, where the OIDC claim types model an absent claim as an
omitted key. That mismatch was not theoretical:
`packages/server-adapter-kit/test/data/token.ts` is a captured response and
carried `family_name: null`.

It was resolved on the SERVER side rather than by widening the claim types to
`string | null`: `OAuth2OpenIDClaimsBuilder.extract` now skips a nullish value,
so an absent claim is an omitted key on the wire, which is what OIDC describes
and what the id_token needed anyway (a JSON `null` claim value is not something
a relying party expects). Widening the types instead would have encoded the
deviation permanently and kept the alias alive. Do not re-add a `| null` to
these claims; fix the producer.

Declaring them is what buys the compile-time check. `JWTClaims` opens with
`[key: string]: any`, so every claim read was `any` and a renamed one compiled
and failed at runtime, which had already cost a downstream consumer real time
via `OAuth2TokenPayload.sub_name`. A declared property NARROWS that index
signature on read (verified, not assumed), while an unknown key still resolves
through it, so nothing else in the payload was constrained.

A commit does not overwrite a held user whose id already matches: the account
console re-seeds the store from its own profile-form response, and a commit
staged before that save would otherwise revert the name it just wrote.

Two things fall out of that. The subject identity cannot drift from the token,
because it IS the token's subject on every commit, so there is no re-fetch.
And a **client** subject yields `null`
instead of a failed lookup: `/userinfo` resolves `@me` through the user service,
which throws for a client actor, and the guards catch a rejected `resolve()`
into a logout. That rejection was load-bearing, though, because `status`
requires a user: a settled client-subject session reads `RESTORING` forever, and
the account console gates its shell, its realm chooser AND its sign-out control
on the status it never reaches. Its router guard therefore treats a settled
`RESTORING` as a failed resolve. The auth console needs no such guard: its
account chooser is written for exactly this state (a settled non-user session
renders the "use another account" escape hatch).

**The user record is deliberately NOT persisted** either. It was the verbatim
`/userinfo` body, and `extendOneWithEA` flattens every user attribute onto that
response AFTER the query projection, so the value was bounded by nothing: one
operator-defined attribute is enough to push the cookie past the 4096-byte
limit, where the browser drops it silently. It also carried the email and both
names into the header of every request on the origin, static assets included.
Copies an earlier version wrote are not swept: they carry no `maxAge`, so they
end with the browser session, and nothing reads them.

The same rule governs `realm_management`, which is narrowed to `{ id, name, displayName }` (the display name is the label the chrome renders and is kept when the row carries one)
in `setRealmManagement` rather than at its call sites: the realm switcher hands
over the whole table row, and `RealmMinimal` is a structural `Pick`, so the
free-text `description` column rode along.

Status is unaffected by any of this. `AUTHENTICATED` requires realm AND user,
and the realm is never cookie-persisted or read from the jar (`commitSession`
assigns `realm.value` from the introspection), so a cookie restore reports
`RESTORING` until `resolve()` settles. Cookie hydration assigns the token refs
directly rather than through the emitting setters, so it writes nothing back;
the authentication hook syncs from those refs when it installs.

### Post-login destination: the `redirect` round-trip

An RP that bounces a visitor to the login flow has to get them back to the page
they asked for. The destination rides in the OAuth2 **`redirect_uri`'s own
query**, not in client-side storage:

```text
/users  ->  /login?redirect=%2Fusers
        ->  <idp>/authorize?...&redirect_uri=<origin>%2Flogin%2Fcallback%3Fredirect%3D%252Fusers
        ->  <origin>/login/callback?redirect=%2Fusers&code=...&state=...
        ->  /users
```

Three properties make this work, and all three are load-bearing:

- **`redirect_uri` stays the fixed callback path.** The destination is a
  parameter *on* it, never a replacement for it. The callback is where the code
  exchange happens, it is the path registered in the client's allowlist, and
  keeping the code off a content page is what RFC 6749 §10.5 asks for
  (`Referer` leakage). The provisioned system clients register `<origin>/**`,
  whose `**` runs to the end of the value, so the query needs no new pattern.
- **The value is replayed from the stored request, never rebuilt from the
  URL.** RFC 6749 §4.1.3 requires the `/token` `redirect_uri` to equal the
  `/authorize` one, and `OAuth2AuthorizationCodeVerifier` compares them with
  `!==` on the raw stored string. By the time the browser is back, its address
  bar carries the appended `code`/`state` and a re-serialized query, so
  reconstructing it from `window.location` would mismatch. `AuthorizationRequest`
  keeps `redirect_uri` for exactly this, alongside `state` and the PKCE
  `code_verifier` (which pin the storage hop regardless; a public client
  cannot redeem without the verifier).
- **The destination is untrusted on the way back.** It arrives as URL input
  that a crafted authorize request could have shaped, so `RoutingInterceptor`
  accepts a site-relative path and nothing else: a value resolving anywhere
  else is dropped rather than reduced to its path, because an attacker-chosen
  path is no better than an attacker-chosen host. **The test is the resolved
  origin, never the leading characters**: the value is resolved against a
  fixed dummy base and refused unless it lands back on it. A
  `startsWith('//')` check is not equivalent and was the first attempt: the
  WHATWG parser reads `\` as `/` under a special scheme, so `/\evil.test/x`
  declares an authority too and walks straight through it.

Nothing here is authup-specific, which is the point: any RP in any framework
gets the behaviour by putting the destination in its own callback URI. There is
deliberately no kit field for it: a field would make the round-trip a
convention each app has to remember rather than a mechanism the protocol
already carries.

`apps/client-account-console` is the one caller that does not participate: its
`redirect_uri` is `origin + pathname` (the current path *is* the destination)
and its back-link uses the separate single-use `authup:account:ref` stash.

### vuecs 1.x SFC integration

Forms, collections and pagination render the compound `<VC*>` SFCs of
`@vuecs/forms` 4.x, `@vuecs/list` 1.x and `@vuecs/pagination` 2.x directly;
there are no render-function builders (`buildForm*`, `buildList`) (#3139).

- **Forms**: entity form SFCs (`components/entities/**/A*Form.vue`)
  render `<VCFormGroup>` / `<VCFormInput>` / `<VCFormTextarea>` /
  `<VCFormCheckbox>` / `<VCFormSelect>` directly, binding each field via
  `@validup/vue`'s `useValidup` and `@ilingo/validup-vue`'s
  `<IFieldValidation>` (see `ARoleForm.vue`). `AFormSubmit`
  (`components/utility/AFormSubmit.ts`)
  wraps `<VCButton>` with `@vuecs/forms`' `useSubmitButton` so the
  create/update label, icon, and color swap stay locale-reactive: a
  deliberate adapter, not a temporary shim. **Split forms & shared
  validators:** multi-section forms (policy, identity-provider) register
  field-group sub-forms under a parent `useValidup` collector
  (`name: 'basic'` / `'client'` / ...), and the parent's `isInvalid` ORs
  the children's `$invalid`. A validup mount without a `group` option
  runs in *every* group, so a sub-form running a shared full-entity
  validator from `@authup/core-kit` unscoped is permanently `$invalid`
  the moment the validator mounts a key the sub-form's state doesn't own
  (e.g. `IdentityProvider.protocol`, required in every group but owned
  by the parent form), with the issue on an unrendered field, the
  submit button never enables and no error is visible. **Scope the
  shared validator with validup's `pathsToInclude`** (`ContainerOptions`
  or `ContainerRunOptions`) to exactly the keys the sub-form renders:
  see `AIdentityProviderBasicFields` / `AIdentityProviderOAuth2{Client,
  Endpoint}Fields`, which reuse `IdentityProviderValidator` /
  `IdentityProviderOAuth2AttributesValidator` instead of redefining the
  mounts inline (single source of truth with the server rules; group
  options per mount are preserved). The alternative (feeding the
  parent-owned key into the sub-form state via a prop +
  `watch(..., { immediate: true })`) is only needed when that key
  should actually be validated client-side (see `APolicyBasicForm`'s
  `type`). Relatedly, the
  kit installs `createValidup` with `optionalAs: null` (blank optional
  inputs are emitted as `null`), so every optional string mount in a
  shared entity validator must be `.nullable()`: server-side runs use
  the default `optionalValue: 'undefined'` and would otherwise 400 on
  the `null`. **Input-group append/prepend slots:** `VCFormInput`'s
  `#groupAppend` / `#groupPrepend` slots hand the theme's joined addon
  class down via slot props: bind it on the slot root
  (`#groupAppend="{ class: appendClass }"` → `:class="appendClass"` on a
  native `<button>`/`<div>`; see `ASecretInput` / `ANameInput` and the
  identity-provider secret toggles). Dropping a raw `<VCButton>` in the
  slot renders a detached fully-rounded button against the input's
  squared group edge (double border/notched seam). Where a real
  `<VCButton>` is intentional (e.g. `AFormInputListItem`'s
  warning-colored delete), square its inner edge with `rounded-l-none`.
  **Entity hydration contract** (`assignFormProperties(form, entity,
  { fields: v.fields })`, `core/form/properties.ts`): the helper assigns
  only keys **declared in the form state**: the form owns its shape, and
  copying every entity key leaks foreign properties into the state and
  from there into submit payloads (a stale sibling-sub-form copy of
  `name` otherwise clobbers the edited value on the identity-provider
  form's spread, #3222). With the validup `fields` accessor supplied,
  hydration is **edit-preserving**: a `$dirty` field whose current value
  differs from the incoming one is skipped (unsaved edit survives an
  entity refresh), while a `$dirty` field whose value matches is
  re-assigned and `$reset` (the edit got persisted, future syncs flow
  again). Two supporting rules: `useUpdatedAt` must be passed a ref or
  getter (`useUpdatedAt(() => props.entity)`): passing `props.entity`
  by value captures the object once and yields a watcher that never
  fires; and user-input handlers must write through
  `v.fields.<key>.$model.value` (never `form.<key> = ...`) so the edit
  is dirty-tracked: direct `form` writes are reserved for hydration
  defaults (`generateName()` fills, prop seeds) that deliberately stay
  clean.
- **Collections**: `defineEntityCollectionManager().render(...)`
  (`components/utility/entity/collection/module.ts`) composes `<VCList>`
  + `<VCListBody>` + `<VCListItem>` + `<VCListLoading>` + `<VCListEmpty>`
  directly. It preserves the `{ header, body, item, footer, noMore,
  loading }` consumer-options shape and the
  `slotProps.created/updated/deleted` callback convention. This is the
  permanent implementation, not a shim. **Single-emit contract:** the
  callbacks delegate to the existing `ListHandlers` instance, which
  already calls `context.setup.emit('created' | 'updated' | 'deleted',
  ...)`: don't add a parallel `emit()` on the wrapper side or every
  mutation will fire twice and double-update Pinia stores.
  **Query composition (rapiq IR, #3278):** the collection/record
  managers compose queries as the rapiq v2 IR (`IQuery`), never with a
  generic object merger. Typed authoring stays at the edges: pages and
  components construct via `defineQuery<T>({...})` (NestedKeys checking
  at construction); the `query` prop / manager-context accepts
  `QueryInput<T> | IQuery` (rapiq's native `isQuery` guard; `QueryInput`
  is `QueryBuildInput<T, 3>`: needs rapiq ≥ 2.0.0-beta.3, where the
  DEPTH parameter is threaded into the string-key arms; on beta.2 the
  self-recursive entities tripped vue-tsc's TS2590, tada5hi/rapiq#790)
  and is desugared at the boundary. Per load, **every** parameter merges
  via `mergeQueries` (left priority: load input ▷ retained interactive
  state ▷ meta pagination ▷ base query). The per-parameter replace decides
  whether a load supersedes the retained interactive value from the raw
  input: `fields` / `filters` / `relations` test the key's PRESENCE
  (`in`), **sorts tests for a DEFINED value** under either accepted
  spelling. Both halves are load-bearing. Since rapiq 2.1.0 (#906) the
  input type accepts `sorts` (canonical) and `sort` (deprecated), and
  checking one alone silently drops a load carrying the other; but rapiq
  documents `{ sorts: props.sorts, sort: props.sort }` as a safe spread
  wrapper, so both keys are routinely PRESENT and `undefined`, which an
  `in` test would read as supplied and use to wipe the retained sorts.
  Supplying both with values throws `KEY_AMBIGUOUS` at desugaring, before
  either check runs. Pinned by *a load carrying %s replaces the retained
  sorts* (parameterized over the two spellings) and *a load carrying only
  undefined sort spellings keeps the retained sorts* in
  `entity-collection.spec.ts`. Since rapiq **beta.19** (tada5hi/rapiq#890)
  filter merging is conjunctive, so the plain `mergeQueries` result guarantees
  that a scope cannot be displaced by a search or sort load and that compound
  trees (`or(...)`) survive as conjuncts. Filters therefore need no carve-out
  and no hand-rolled AND injection. Pinned by *search input cannot displace the
  injected scope* and *composes context query and props query, both
  non-displaceable* in `entity-collection.spec.ts`. The latter still
  asserts the pre-refactor filter string; the former's search term is now
  the multi-field OR below, and its AND composition is unchanged. The
  `queryFilters` context hook may return an `ICondition`
  (`or(contains('name', q), contains('displayName', q))`) or a legacy
  filters record. **`ASearch` passes the raw search text as a bare
  `filters.name` string** (never a wire marker: the rapiq v2 IR builder
  does NOT interpret `~foo`/`!foo`/`<5`; a `~foo` value decodes as
  `eq(name,'~foo')`, a literal exact-match, which silently broke name
  search). The manager turns that bare `name` string into a condition via
  the `queryFilters` hook when provided, else
  `buildEntitySearchCondition(type, text)` (`collection/utils/search.ts`):
  `contains('name', text)` OR'd with a `contains` per extra field the
  entity declares in `ENTITY_SEARCH_FIELDS`. That map is keyed by
  `EntityType` and lists `displayName` for the eight entities whose
  schema allows filtering it (client, identity-provider, permission,
  policy, realm, role, scope, user; #3429); every other entity searches
  `name` alone. **It mirrors the server `filters.allowed` allow-lists and
  must be kept in step with them**: rapiq resolves keys strictly and
  answers an unknown one with `keyNotAllowed` (400) rather than pruning
  it, so an entry a schema does not allow turns search into a failed
  request instead of a narrower one. The server half of that contract is
  pinned by `test/unit/core/query/console-search-surface.spec.ts`, which
  states the eight entities and their fields outright and fails when one
  stops being filterable. The sibling `indexed-invariant.spec.ts` cannot
  serve that role: it DERIVES its search shape from the allow-list
  (`allowed.includes('displayName') ? or(...) : contains(...)`), so a
  removal makes it silently stop exercising the compound shape rather
  than fail. Verified by removing `displayName` from the client schema:
  the new spec fails, the invariant spec stays green at 17 passed. This is what makes the console
  search name and display name at once with no per-page wiring: all 24
  `ASearch` call sites pass no `queryFilters`, so before it they searched
  `name` only and the server-side half of #3429 was unreachable from the
  UI. An empty search (`filters: {}`) resets to the
  base scope. Build every filter through the `@rapiq/core` helpers
  (`eq`/`contains`/`inArray`/`and`/`or`/`not`/…), never a raw wire string.
  Interactive state (search filters, sorts) is retained
  **inside the manager** across loads: a pagination-only
  `load({ pagination })` keeps the current search; an assembled
  `IQuery` load input replaces the interactive state wholesale.
  **A load that CHANGES the filters drops the retained offset**
  (compared by the wire form `buildQueryString` emits, so the manager
  needs no knowledge of the IR's shape): the narrowed set is shorter, so
  page 2+ would ask for rows past its end and render empty under a
  non-zero total (issue #3443). The first load is exempt (nothing changed
  yet), a load repeating the same filters keeps its page, and an input
  carrying its own pagination still wins by merge precedence. This is a
  property of the manager rather than caller discipline, because a per-caller
  reset is the thing that gets forgotten. Neither `ASearch` nor a page passes
  `pagination: { offset: 0 }`.
  Pinned by
  `test/unit/components/utility/entity-collection.spec.ts`.
  **Initial load & the SSR handoff (issue #2773):** see
  *SSR data handoff* below.
- **Pagination**: `<APagination>`
  (`components/utility/pagination/APagination.ts`) is a thin **adapter**
  that bridges the entity-collection footer contract (`ListMeta` =
  `{ total, pagination: { limit, offset }, busy }`: pagination UI
  state only, query state does not round-trip through it, plus a
  `load(input)` callback) onto `<VCPagination>`'s flat
  `:total` / `:limit` / `:offset` props and `@load({ offset })` event;
  page changes send only `{ pagination: { limit, offset } }`.
  It earns its keep: the ~30 footer call sites would otherwise each
  duplicate the `meta`-destructuring and the `@load` re-wrap. Its
  joined-tab rounding + brand hover styling lives in the theme's
  `.vc-pagination` rule (`client-web-theme/assets/css/index.css`) and
  applies to the underlying `<VCPagination>` regardless of the wrapper.

### SSR data handoff (issue #2773)

Everything a server render fetches or resolves is handed to the browser
through the host's hydration payload, so the client never repeats it. The kit
owns one seam and stays framework-agnostic; each host supplies the bucket:

- **The seam.** `HydrationStore` (`core/hydration/`, a `get`/`set`/`delete`
  map) passed to `install({ hydrationStore })` and read via
  `injectHydrationStore()`. **Without a store the kit performs no server-side
  loads at all**, because the response could not reach the client and firing it would
  only waste a round trip (the pre-#2773 behaviour: every collection fired a
  request during SSR whose result was discarded when the render flushed).
- **Hosts.** A Nuxt consumer on `@authup/client-web-nuxt` (hub) gets it from the `authup:kit` Nuxt plugin
  over `nuxtApp.payload.data` (the same bucket `useAsyncData` transports
  through); `apps/client-auth-console` wires it over `HydrationPayload.hydration`, which
  works because `createWindowPayloadHTML(ctx.payload)` runs *after*
  `renderToString` (`apps/client-auth-console/src/server.ts`), so writes
  during the render still
  reach the markup.
- **Collections.** `defineEntityCollectionManager`'s initial load runs inside
  `onServerPrefetch` (so the renderer awaits the rows and they are in the
  HTML) and records `{ data, total, pagination }` under
  `authup:collection:<type><serialized query>`. The key is the identity of the
  request the load would send (`buildQueryString` over the composed query), so
  both sides derive it identically; a miss just loads normally. Collection
  snapshots are **consumed on read**, so a later client-side visit fetches fresh
  rows instead of replaying the first render's.
- **`usePermissionCheck`.** The permission evaluator awaits the policy engine,
  so a server-rendered subtree would hydrate against a fail-closed `false`
  where the markup shows an enabled control. It records its verdict through
  `useHydratedValue()` and seeds the first client render from it. These
  entries are **not** consumed on read (the same key is shared by every
  component asking the same question), and a permission key carries the actor
  (`userId`/`realmId`) so an account switch cannot adopt the previous actor's
  verdict; checks carrying a `PolicyData` bag are not keyed at all and keep
  evaluating from their fail-closed default.
- **`useTranslation` records only what the sync read could not answer.** Since
  **ilingo 6.1.0** (tada5hi/ilingo#988) `@ilingo/vue` **seeds** the ref from
  `IIlingo.getSync()`, then resolves the async `get()`. Without a synchronous
  read a fresh ref carries the `authupField.name` placeholder where the markup
  says `Name`. Authup's catalogs are a `MemoryStore`, so the seed
  is the translation and nothing rides the payload for any authup key. The
  recording survives as the fallback for the case the seed cannot cover: a
  store that needs I/O (a cold `FSStore`/`LoaderStore`, a remote adapter a
  consumer registers ahead of the kit's own) throws `SyncUnavailableError` out
  of the sync read, leaving the placeholder in the first render of a
  server-rendered subtree. Detecting that takes both halves of ilingo's
  contract, because `@ilingo/vue` falls back to the same
  `<namespace>.<key>` placeholder for a **refused** read and for a **missing**
  key. A seed equal to the placeholder therefore only rules the seed out; the
  kit then asks `getSync()` itself, and hands the resolved string over only
  when the call throws. A key the store answers `undefined` for is missing in
  the async pass too, so there would be nothing to record.
- **Per-request isolation is the security property.** A collection key is
  entity type plus query, with no actor in it, so two users requesting the same
  list derive the SAME key. Nothing may therefore outlive one request: both
  hosts build a fresh payload per request (Nuxt's `payload.data`; every
  `renderPage` caller in the auth console service passes a new
  payload literal, and the memos `createRenderPage` keeps in its per-handler
  closure hold only the immutable template / manifest / bundle), and the store is provided on
  the per-request Vue app, so it is unreachable once the render ends. Same
  reasoning as the `lifetime: 'transient'` registration of server-core's
  loopback client. Backing the store with anything
  shared between requests would serve one client's rows to another. As a second
  layer the kit's server path is **write-only**: `useHydratedValue` returns
  before its read, and the collection manager's server branch never adopts (it
  is the producer), so a mis-wired host store can waste a write but cannot leak
  across users. Pinned by *never adopts an existing entry while rendering on
  the server* in `entity-collection-hydration.spec.ts`. The payload is exactly
  as sensitive as the HTML it travels in, so an authenticated page must never
  be served from a shared cache (no `swr` / `isr` route rules).
- **The admin console does not participate.** It is a
  client-only SPA: no server render, so the kit performs no server-side
  loads for it and nothing is handed over. Its detail pages
  (`apps/client-admin-console/src/pages/<entity>/[id].vue`) fetch their
  record with a plain `ref(await ...)` in an `async setup()` under the
  app-level `<Suspense>`; there is no `useAsyncData` dedupe to think about
  without a server pass.

Verified end to end in a browser (CDP) while the admin console was still
server-rendered: `/users` rendered its rows server-side, the client issued
**no** collection request on hydration, and Vue reported no hydration
mismatch. That is the behaviour a downstream Nuxt consumer still gets.

### Table usage

All 9 entity index pages (`apps/client-admin-console/src/pages/<entity>/index/index.vue`)
use `<VCTable>` directly with `:data="props.data"` + `:columns="columns"`.
Per-cell rendering flows through the `#cell-<key>` template slots that
`<VCTable>`'s auto-render path dispatches onto each `<VCTableCell>`
(tada5hi/vuecs#1592).

**Row typing (tada5hi/vuecs#1601):** `<VCTable>`
is generic over `Row`, and the inference flows from `:columns` /
`:data` into the `#cell-*` slot props. Each page types its columns as
`TableColumn<Entity>[]` (e.g. `computed<TableColumn<Role>[]>(...)`), and the
cell slots are written **without** a row annotation (`#cell-builtIn="{ row }"`)
so `row` infers as the entity type; never annotate it `any`. **`VCTable` must stay globally registered** (`app.use(vuecs, …)`): the
generic `VCTableComponent` is a generic call signature that is **not**
assignable to the Options-API `components: {}` `Component` slot, so a local
`import { VCTable } + components: { VCTable }` makes `defineComponent`'s
overload resolution fail (`TS2769`). The `GlobalComponents` augmentation
carries the generic, so template inference works via global registration:
this is the one documented exception to the "explicit VC imports" convention.

Alignment classes (`headerClass: 'text-center'`, `cellClass: 'text-center'`)
go through as written: no Tailwind v4 `!` suffix needed.
`@authup/client-web-theme`'s `clientWebTheme()` overrides
`tableHeadCell.classes.root` to drop theme-tailwind's baked
`text-left` (default `"px-3 text-left font-medium"` → `"px-3 font-medium"`),
so the consumer-side class wins on source order. If theme-tailwind
ever bakes alignment into `tableCell.classes.root` (today it's just
`"px-3 align-middle"`), the same pattern can be applied to that
element in the theme override.

### Theme and Tailwind rules

- **Two theme layers, kit first.** `clientWebKitTheme()`
  (`@authup/client-web-kit-theme`) extends `tailwindTheme()` from
  `@vuecs/theme-tailwind`; `clientWebTheme()` (`@authup/client-web-theme`)
  layers authup's app overrides on top. Register both, in that order:
  `themes: [clientWebKitTheme(), clientWebTheme()]`
  (`apps/client-auth-console/src/app.ts`). Dropping the kit theme loses the
  component defaults. The CSS mirrors it: the kit theme's entry imports `tailwindcss`,
  `@vuecs/design` and `@vuecs/theme-tailwind`, and the app theme's entry
  imports the kit theme.
  There is no Bootstrap anywhere: never write Bootstrap-shaped class names
  (`.dropdown*`, `.modal-*`, `.btn`), use the `<VC*>` component.
- **Tailwind v4 only** (`@tailwindcss/vite` in each console's vite config).
  Write v4 syntax: important is a suffix (`text-3xl!`), opacity is slash
  notation (`bg-blue-500/20`), CSS variables use parens (`bg-(--x)`),
  `outline-hidden` (not `outline-none`) removes an outline, the default ring
  is 1px (`ring-3` for the old look).
- **Class strings outside an app are only generated if a `@source` covers
  them.** `@authup/client-web-kit-theme/assets/css/index.css` scans the kit
  (`src` and `dist`) and `@vuecs`; each console's `src/tailwind.css` declares
  its own scopes. A utility used only in an unscanned place renders unstyled
  with no error.
- **Semantic colour names are theme-tailwind's**: `bg-bg`, `bg-bg-muted`,
  `bg-bg-elevated`, `text-fg`, `text-fg-muted`, `border-border`, and the
  `primary` / `success` / `warning` / `error` / `info` scales. It is `error`,
  not `danger`, and there is no `secondary`, `light` or `dark` palette.
- **Tokens** live in `packages/client-web-theme/assets/css/index.css`
  (`@layer base`), in three groups. Surfaces (`--authup-surface-*`) flip with
  the colour mode and are bridged onto `--vc-color-bg*` / `-fg*` / `-border`
  in `:root` only, so the `.dark` flips propagate. They stay genuinely dark in
  dark mode: a light-mid grey would put the light `--vc-color-fg` at about
  1.7:1. Chrome tokens (`--authup-chrome-*`) also flip: light mode aliases the
  vuecs tokens, dark mode pins the slate ramp. Brand accents
  (`--authup-periwinkle`, `-rose`, `-salmon`, `-green`) are constant across
  modes; periwinkle drives the `--vc-color-primary-*` scale.
- **Install order:** per-package plugins (`installForms`,
  `installPagination`) run after `app.use(vuecs, ...)` (see structure.md →
  *UI Stack*).
- **Slot names:** `EntityCollectionSlotName` uses the local string vocabulary
  in `packages/client-web-kit/src/core/slot.ts`, since `@vuecs/list` 1.x ships
  no `SlotName` enum. New code composes the `<VCList*>` parts instead of
  dispatching on slot names.
