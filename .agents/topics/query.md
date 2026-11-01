# Query IR, schemas and vocabulary discovery

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

### Query IR flow (schemas in core, decode in services, execute in adapters)

The rapiq pipeline is split along the hexagonal boundary: core owns schemas
and decoding, adapters only execute.

**Layout**

- **Schemas**: one `defineSchema<T>` per entity at
  `core/entities/{entity}/schema.ts`. They are the server-side allow-list
  (fields, filters, relations, sorts, `pagination.maxLimit`) and deliberate
  security policy, never derived from entity metadata. Entity-derived schemas
  were rejected (#3279): every derivable part must be overridden under
  `EntityType` naming anyway, and a boot-populated registry breaks
  DataSource-free decode in unit tests and `vi.mock` hoisting.
- **Registry and decode**: `core/query/` owns the `SchemaRegistry`, the URL
  codec (v2 expression dialect and legacy v1 brackets) and the async
  `decodeQuery(input, { schema, parameters?, actor? })`. `parameters`
  restricts what is parsed (`['filters']` for the bulk revokes, the record
  subset for single reads); `actor` reaches the schema validate hooks.
- **Services decode once** and pass the IR down (multi-branch services decode
  into a local). Allow-lists, defaults and pagination bounds apply at decode.
- **Adapters execute only**: `applyQuery(qb, query?)` in
  `app/modules/database/repositories/query.ts` wraps
  `@rapiq/adapter-typeorm` plus the DISTINCT-id `GROUP BY` join hook. An
  adapter never decodes.
- **Extension point**: `defineSchemaRegistryWithDataSource` could add
  storage-derived schemas. Nothing is wired; the explicit allow-lists are the
  only query surface.

**Include authorization (#3295)**

- Every schema's `relations.validate` is
  `createRelationsReadGate(schemaMapping)` (`core/query/relations.ts`). Per
  relation it runs the target type's read pre-gate from
  `RELATION_TARGET_READ_GATES`, which must mirror each target service's own
  `getMany` gate. REALM and IDENTITY_PROVIDER are ungated (anonymous lists);
  POLICY sits under the PERMISSION family. Nested paths gate hop by hop.
- Deny is a silent strip: the include and every dotted filter/sort/field key
  traversing the denied relation are pruned, and the request still succeeds.
  So `filter[user.name]` is gated exactly like `include=user`.
- A decode without `actor` is a SYSTEM decode and runs unrestricted. Every
  request decode passes one; `buildActorContext` builds one for anonymous
  requests, which holds no grants.
- Every schema declares `relations` explicitly (`event` and `realm` pin
  `allowed: []`): an omitted allow-list falls back to rapiq's syntactic name
  check.
- Schemas import `relations.ts` / `fields.ts` / `filters.ts` as FILES, never
  the `core/query` barrel: the barrel reaches `module.ts`, which imports every
  schema, and the cycle TDZ-crashes.

**Field authorization (#3322)**

- A schema gates columns via `fields.validateMany`
  (`createFieldsReadGate(gates)`, `core/query/fields.ts`), called once per
  (schema, relation path) with the client-requested names. A gate answers
  `true`, `false` (strip) or an `ICondition`: the column stays projected but
  is visible only on rows satisfying it, at the root and under any
  `fields[relation]` position (that is what closes
  `GET /client-permissions?fields[client]=secret`).
- Enforcement has two parts. The rapiq SQL adapter force-selects every column
  a condition reads. Every `findMany` adapter reads through `fetchMany(qb,
  query)` (`repositories/query.ts`), which redacts failing values; rows never
  drop and totals stay exact.
- Redaction is fail-open by construction (a fetch that skips it ships the
  value), so it is structural (#3329): `fetchMany` is the only exported
  fetch, and `eslint.config.js` refuses `getManyAndCount` under every
  `repositories/` directory except `query.ts`.
- Author conditions fail-closed over missing columns (positive legs plus a
  presence guard like `ne('realmId', null)`): `@rapiq/adapter-memory` treats a
  missing column as `null`, so a negated or null-inclusive leg would match an
  unfetched column.
- The only gated column is `client.secret`: visible iff `secret` is null, or
  covered by the compiled `CLIENT_READ/UPDATE/DELETE` condition, or the row is
  the actor's own client. A hashed secret is gated like a plaintext (#3328,
  bcrypt of an admin-chosen secret is crackable). `secretEncrypted` is not a
  leg: `ClientService.revealSecret` decrypts after redaction, so a read never
  serves ciphertext (see *Client secret storage and rotation*).
  `ClientService.getMany` composes no secret WHERE; a `post` verdict strips
  values rather than evaluating per row.
- An explicit include is narrowed to the target schema's field projection, so
  include and auto-join behave the same and the gate covers both.

**Projection rules**

- **Junction/attribute schemas pin `fields.default`**: without root fields an
  `include=` selects only relation fields, the adapter's `select()` replace
  drops every root column including the id the DISTINCT-id wrapper needs, and
  the request 500s. The list must name every scalar column.
- **Every include-target schema needs a `fields` block**: without one the
  schema selects all columns as a root but nothing as an include child, so the
  relation comes back `undefined` with a 200 (#3313).
- **Boot drift validation**: `DatabaseModule.setup` runs
  `validateEntitySchemas(dataSource)`
  (`repositories/schema-validation.ts`). `assertSchemaMatchesEntity` checks
  allow-lists, defaults and declared index sequences against TypeORM metadata;
  a renamed column fails the boot. `assertSchemaFieldsCoverEntity` requires
  every selectable column in `fields.default` or `fields.allowed`, because an
  undeclared column silently vanishes from every response. `select: false`
  columns are exempt automatically; any other column kept off the wire goes in
  `SCHEMA_FIELD_EXCLUSIONS` (today `userAuthenticator.parameters`).

**Server-derived scopes**

- Inject scopes with `appendQueryConditions(query, ...conds)` (`core/query`):
  an AND-wrap that bypasses the allow-lists and cannot be displaced, since
  rapiq filter composition is conjunctive (`mergeQueries` keeps every
  conjunct).
- Consequence: two `eq` on one field intersect to nothing. Transient UI state
  must be replaced before the query is built, never merged over.
- Never splice a scope into the RAW wire query: under
  `codec=url-expression` the `filter` key is an expression string, so
  object-splicing discards the client filter and 500s at decode.
- `preserve()` and `IFilters.merge` are unused; `preserve()` would make a
  relations-gate rejection throw `SCHEMA_PRESERVED_CONDITION_PRUNED`.

**Indexed filters and sorts**

- Every schema declares `indexes` and opts into `filters: { indexed: true }`
  (each AND group needs a conjunct leading a declared index) and
  `sorts: { indexed: true }` (the key sequence must be a leftmost prefix of
  one index). `assertSchemaMatchesEntity` fails the boot when a declared
  sequence is not a prefix of a real PK/unique/index.
- **Invariant: every allowed filter and sort key leads a declared index**, so
  enforcement never rejects what the allow-lists permit. Adding a key to an
  allow-list therefore requires a backing entity index and its generated
  migration; otherwise an unanchored filter on it is a 400.
- A multi-key sort with no matching composite prefix is dropped whole (no
  schema has a sort default, so the query decodes unsorted).
- **A missing `sorts` block is a 500, not fail-soft**: rapiq falls back to a
  syntactic check and a bogus key reaches `ORDER BY` (#3441). Every schema
  declares one.
- **An `or(...)` anchors only when every branch anchors.** The console search
  `or(contains('name', q), contains('displayName', q))` survives inside a
  realm-scoped AND (the `realmId` conjunct anchors) but, unscoped, every
  branch must lead an index. That is why `displayName` is filterable and
  index-leading on every entity that has it. The index makes such a search
  legal, not fast (`contains` is a leading-wildcard `LIKE`).
- Spec trap: `indexed-invariant.spec.ts` derives its subject from the schema
  description, so it fails open if a description key is renamed. Keep its
  *should have sort allow-lists to check* guard.
- Structures whose leading column is not queryable (session
  `ipAddress`/`userAgent`, `user.email`) stay undeclared on purpose.
- (filter, sort) composites exist only on the unbounded tables:
  `auth_events (realm_id, created_at)`, `auth_sessions (user_id, seen_at)` and
  `(realm_id, seen_at)`, `auth_session_tokens (session_id, created_at)`. The
  single-column indexes stay: they serve unsorted lookups, and a composite
  serving a MySQL FK would make dropping the single a constraint problem.

**Queryable surface**

- The API is public, so the surface is wider than the consoles use: a column
  may become filterable when it is readable (never a `select: false` secret,
  hence `user.email` stays out), leads a real index, and compares correctly
  once bound.
- **`createdAt`/`updatedAt` take range operators only** (#3639). The adapter
  binds the operand in storage form and refuses a malformed date with
  `AdapterError` `KEY_VALUE_INVALID`, which `sanitizeError` maps to 400.
  - Equality is refused: stored precision differs by dialect while the API
    answers milliseconds, so `eq` against a returned value matches nothing.
    `createTimestampFiltersGate` (`core/query/filters.ts`) admits only
    `lt`/`lte`/`gt`/`gte`, matched on the last path segment (so
    `filter[user.createdAt]` too), and THROWS otherwise. It must throw:
    returning `undefined` drops the leaf and widens the page to every row. The
    rule is not in `meta.schema`, which is why the prose query docs state it.
  - An inclusive bound equal to a returned value is not a guaranteed match
    across dialects. Widen by a second.
  - Everything is UTC. `DataSourceOptionsBuilder` ends with
    typeorm-extension's `pinTimezone(options, 'UTC')` on every path (boot,
    migration CLI, tests). Pinning only the read side was rejected: on a
    local-time database it shifted values and put `auth_time` in the future,
    which satisfies `max_age`. An explicit contradicting setting fails the
    boot. Rows stamped by a local-time database before the pin keep their
    local wall clock (see upgrading.md).

### Query vocabulary discovery

**One registry, three projections.** `schemaRegistry` is what the decoder
enforces; three surfaces publish it, all from `describeSchemaRegistry()`
(`core/query/describe.ts`) unchanged, `indexes` included:

- `meta.schema` on every query-capable response (#1649): the full description
  on a collection read, the `RECORD_QUERY_PARAMETERS` subset on a record read;
- `GET /schemas` and `GET /<collection>/@schema`;
- the OpenAPI document's root `x-authup-schemas`, at build time.

Nothing is filtered on the way out, which is what lets the parity spec compare
by deep equality (testing.md -> *The OpenAPI parity gate*). Stripping
`indexes` from one projection is rejected: it already ships in `meta.schema`,
and parity would become a per-key convention. `computeSchemaRegistryHash()`
(`core/query/hash.ts`) feeds `x-authup-schema-hash`, `meta.hash` and the
swagger middleware's boot comparison.

**`@DQuerySchema(<EntityType>, <shape>)`** (`adapters/http/decorators/query-schema.ts`)
marks each query-capable method, a runtime no-op that trapi reads.

- Shapes are `'collection' | 'record' | 'filters' | 'stats'`
  (`QuerySchemaShape`); `trapi.config.ts` maps them onto the parameter
  subsets. Arguments must be an enum member or literal: trapi cannot fold an
  imported constant, so `RECORD_QUERY_PARAMETERS` itself resolves to nothing.
- It is per method, so dual-mounted controllers get it on every mount with no
  path map. Deriving the schema from the response component was rejected:
  `PolicyController` returns `EntityCollectionResponse<PolicyResponse>`.
- `DELETE /sessions` and `DELETE /session-tokens` carry the `'filters'` shape.
  No coverage guard can find a missing bulk-revoke marker (both schemas
  already have a marked collection read), so add it by hand on any new
  filter-decoding route.

**The trapi handler** is an inline preset in `trapi.config.ts`
(`querySchemaHandler`, extends `@routup/decorators/preset`). It resolves the
name via `schemaRegistry.getOrFail` (`EntityType` is wider than the registry)
and throws on an unfoldable argument or unknown schema, failing the generate.

- A handler's `draft.extensions`, `draft.responses` and `draft.parameters`
  (trapi 2.1.1) land on the operation. Root
  keys (`x-authup-schemas`, `x-authup-schema-hash`, the `ErrorResponse`
  component) ride `swagger.data.extra`, the only channel to the document root.
- `build:swagger` is a plain `trapi generate`; nothing rewrites the document.
- Contributed parameters are appended after the derived ones, so they never
  displace a path variable. Their `in` must be `queryProp`, not `query`, or
  both emitters drop them.
- The `default` error response is document-wide. `code` stays a plain string,
  not an enum: a closed enum would make generated clients fail on a new code.
- The 400 response is added only for shapes that decode a filter: every other
  query parameter fails soft.
- Operation ids use `operationIdStrategy: 'path'`.
- The `realmId` path variable has no description: a contributed parameter
  cannot describe a trapi-synthesized variable without duplicating it.
- Parameters are generic and comma-separated, never one per key. Per-key
  enums were rejected: they bloat the document, nested `deepObject` is
  undefined (OAI #1706), and an enum reads as a guarantee while the relation
  and field gates strip per actor. Descriptions carry the upper-bound caveat;
  `fields` lists the union of `default` and `allowed`.

**Coverage guards** live in `test/unit/http/openapi-coverage.spec.ts`. The
two that read `dist/swagger.json` skip when it is absent (`build:server:js`
wipes `dist/`), so a run that never regenerated the document checked only the
source pairing.

| Guard | Fails on |
|---|---|
| marker -> document | a marker naming a schema `x-authup-schemas` lacks |
| registry -> operations | a registered schema with no marked collection read (exclusion list empty; a stale entry fails) |
| marker -> source | `describeQuerySchema` in an unmarked method, or a marked method describing nothing unless listed in `MARKERS_WITHOUT_DESCRIBE` |

**Trap: trapi `paths` resolution.** If it breaks, entries fall through to the
workspace dist symlinks and typed payloads collapse to
`additionalProperties: true` while trapi exits 0. If payload types thin out,
suspect resolution first.

**`GET /schemas` and `GET /<collection>/@schema`**
(`controllers/workflows/schema/`, `core/query/discovery.ts`;
`client.schema.getMany()`, `client.<entity>.getSchema()`).

- Not the entity envelope: `meta` carries `version`, `hash` and
  `recordParameters` (shared by every entity, so stated once).
- The facet is one route, `/:collection/@schema` on `SchemaController`
  (`@DController('')`), mapped through `SCHEMA_COLLECTIONS`
  (`schema/constants.ts`). That controller must be registered before every
  entity controller, or `/users/:id` takes `@schema` as an id. The lookup
  guards own-property (`Object.hasOwn`), or `/constructor/@schema` answers
  from `Object.prototype`. The user authenticator has no facet (its
  collection is nested); the bulk read still describes it.
- Flat only: a schema is realm-independent, so no `/realms/:realmId/schemas`.
  Never under `.well-known/*` (the realm-scoped OIDC surface).
- Always `/roles/@schema`, never `/roles/schema`: `schema` is a valid entity
  name and would shadow a role named so. `@` marks a reserved segment no row
  key can take (`@me`, `@self`, `@schema`, `@stats`); a facet route must
  still be registered before `/:id`.
- `ForceLoggedInMiddleware`, no permission gate: a description is an upper
  bound of what may be asked. `core.querySchemaDiscoveryEnabled`
  (`QUERY_SCHEMA_DISCOVERY_ENABLED`, default true) turns both routes into 404
  for authenticated callers; anonymous callers get 401 either way.
  `meta.schema` is unaffected.
- The vocabulary is public: `/docs/openapi.json` serves the same descriptions
  anonymously by default. Do not write docs or code as though the login gate
  makes it secret; the defence is on the reads.
- No handler sets an ETag: routup overwrites it with its own content ETag.
  The fingerprint rides `meta.hash` and `x-authup-schema-hash`.

**`/docs/openapi.json`** (`adapters/http/middleware/built-in/swagger.ts`)
must be registered before `@routup/swagger-ui`, which answers every path under
its mount with its HTML shell (the failure is a 200 with the wrong type). A
missing document disables the surface instead of aborting the boot. A hash
mismatch with the running registry logs a warning, the only drift signal
under `authup dev`.

**Docs site**: `apps/server-core/scripts/query-reference.mjs` renders
`docs/src/guide/development/api-query-reference.md` from the built document in
`.github/workflows/docs.yml`. It is generated and gitignored, so
`docs/src/.vitepress/config.mjs` carries an `ignoreDeadLinks` entry for it.
`api-query-language.md` (the dialect prose) is committed.

**Settled, do not re-litigate:**

- Per-actor effective vocabulary, if added, evolves `meta.schema`, never a
  `@schema?effective=true` mode, which would make the body caller-dependent
  and break the hash comparison.
- Discovery stays default-on: it is authenticated and publishes an upper
  bound.
