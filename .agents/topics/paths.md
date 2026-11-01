# Paths (folders for users and clients)

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

### Paths (folders for users and clients)

`auth_paths` is a realm-bound folder tree users and clients are filed under
(Keycloak groups without role mappings).

**Shape.**

- `parentId`: nullable self-FK, `ON DELETE CASCADE`, null = root. `name`: one
  segment, canonicalized like every identifier. `path`: the SERVER-MANAGED
  full slash path (`sales/berlin`, `varchar(255)`, unique per
  `(realmId, path)`), derived from the parent chain and never accepted from a
  caller. `realmId` is NOT NULL: a folder is never global.
- No `@Tree`, no closure table: descendants are a prefix on `path`, ancestors
  its prefixes, children `eq('parentId', x)`. Because `path` is NOT NULL, no
  #3559 coalesce index is needed: a duplicate segment collides on the derived
  path.
- Depth is capped at `PATH_MAX_DEPTH` (15, `@authup/core-kit`).

**No authorization semantics.** A folder grants and withholds nothing and is
not a reach axis; `@authup/access` knows nothing of it. Do not add a
`pathScope` next to `realmScope`.

- Folder-scoped delegation is an ordinary `ATTRIBUTES` junction policy:
  `{ pathId: { $in: [...] } }` on a `USER_*` / `CLIENT_*` grant, or a
  `$startsWith` over `path` on a `PATH_*` grant. Updates under such a grant are
  checked against the stored AND the updated row (`evaluateUpdate`, #3654), so
  a delegate can neither refile a row into its folder nor out of it.
- `PolicyAttributesValidator` refuses `$regex` at any depth on every
  `/policies` write (synchronous regex on the shared event loop; sqlite has no
  `regexp`). Provisioning files are not checked, and stored rows keep
  evaluating.
- Only a global admin can author such a policy: `applyJunctionCreateGrant`
  nulls a requested `policyId` unless the actor holds an uncapped, policy-free
  grant (#3158 / #3159 / #3160). A `sales` admin cannot mint a `sales/emea`
  one.

**`pathId` on `User` and `Client`.** Nullable, `ON DELETE SET NULL`, null =
unfiled. Mounted for CREATE, UPDATE and PROVISIONING (unlike `realmId`, a row
is movable). The service asserts the folder's realm equals the row's, since
`validateJoinColumns` checks existence only. It is in both `*-names-self-manage`
denylists, so nobody refiles themselves. It is filterable and index-leading but
deliberately NOT sortable.

**The `path` relation is ungated, the collection is not.** `path` is ungated in
`RELATION_TARGET_READ_GATES` like `realm`: a reader of a row may see where it
is filed (the account console's `GET /users/@me?include=path`, the admin list's
folder column). `GET /paths` stays gated on the `PATH_*` read triple, so the
folder tree and subtree lookups need `PATH_READ`.

**Lifecycle.**

- Rename (`{ name }`) and move (`{ parentId }`) recompute the folder's `path`
  and rewrite every descendant's by prefix in ONE transaction with row locks
  (`lockRows`). A new parent must be in the same realm and not the folder or a
  descendant.
- Two renames at different depths of one chain take locks in opposite orders
  and the database aborts one side. The adapter retries on
  `isDatabaseLockConflictError` (typeorm-extension): the aborted transaction
  wrote nothing and the callback derives every write from its own locked reads.
  Unretried, that race answers 500.
- A create locks its resolved parent and derives the path from THAT read,
  never from the unlocked resolve the gates ran on. Otherwise an ancestor
  rename in between stores a path its own parent chain contradicts, and
  nothing recomputes it later.
- Delete is never refused on occupancy and never relies on the DB cascades:
  `unwindPaths` (`app/modules/database/repositories/path/unwind.ts`) unfiles
  the subtree's users and clients, then deletes folders deepest first, in one
  transaction. The realm delete runs the same unwind. Left to the cascades,
  InnoDB's limits (15 cascade levels, 30 tables per statement from MySQL 9)
  make a deep delete a 500. The cascades stay as a backstop.

**`ensurePath(repository, realmId, 'a/b/c')`** ("mkdir -p") is the one
primitive for any caller holding a path STRING: the provisioning synchronizers
(realm `paths` and a user/client `relations.path`) and
`IdentityProviderAccountManager.saveUser`.

- Federated users are filed under `sources/<provider name>` at CREATE when no
  attribute mapping targets the folder. Forward-only (never refiles) and
  never-fail (a folder must not fail a login).
- A MAPPING re-applies on every login (overwrites a manual refile), supplies a
  folder UUID, and is realm-checked in `saveUser`, because that write bypasses
  `UserService.save` and a foreign folder would leak through `include=path`.
- The walk runs inside the repository transaction so no ancestor is renamed
  under it. A unique-index race on a not-yet-created segment is recovered
  OUTSIDE the transaction by re-running the walk: postgres aborts the whole
  transaction on a failed statement, so an in-transaction re-read fails too.

**Provisioning.** A realm entry's `paths` declares folders by full `path` plus
`displayName` / `description` and `strategy`, synchronized after scopes and
before clients and users. A user/client `relations.path` goes through
`ensurePath`, so it needs no `paths` declaration. The folder is resolved only
on the branch that writes the row (`createOnly` over an existing row creates no
chain), and under `merge` a declared `relations.path` applies even when the
strategy's `attributes` list omits `pathId` (#3632).

**Listing rows by folder.**

- Always `inArray('pathId', ids)`, never `filter[path.path]` (a join per read).
  The console resolves the subtree on `GET /paths` (sibling-safe prefix plus
  the folder itself), paged to `meta.total`.
- Two ceilings in `apps/client-admin-console/src/composables/path-scope.ts`:
  `PATH_SCOPE_PAGE_LIMIT` (10 pages) and `PATH_SCOPE_ID_LIMIT` (300 ids; more
  outgrows node's 16 KB header budget). Past either, the console scopes NOTHING
  and says so: a silently short folder list is a wrong answer, not a narrower
  one.
- The `path` prefix filter is a scan on postgres/mysql (`@rapiq/adapter-sql`
  lowers `startsWith` over `lower(column)`, no matching index). Accepted: the
  table is small.

**Reloading a collection whose base query a page narrows.** All four rules are
needed for `?path=` to reach the server:

- Reload post flush: the manager reads its base query off its `query` PROP,
  which updates only on parent re-render.
- `load` is a silent no-op while another load runs, so the manager exposes
  `busy`; wait for idle, then ask once. The wait has no deadline (any ceiling
  answers a folder with the whole realm); it ends on `busy` clearing or the
  page unmounting, and a newer scope supersedes an older wait.
- A scope still RESOLVING contributes no filter; one resolved to nothing
  contributes the empty id list (rapiq encodes an empty `in` as constant
  false, which would list nothing while the lookup is out).
- A folder in the route stays pending until the `PATH_READ` check SETTLES
  (`usePermissionCheckState().settled`), else the first load lists the whole
  realm (#3632).

A failed lookup, and one missing the named folder, stay fail-closed (list
nothing) but report `failed` (with `retry`) / `missing` so the page shows a
notice. The parent picker of an existing folder excludes the folder and its
subtree.

**The tree pane (`APathTree`, kit).** Renders `<VCTree>` over
`parseTreePaths`, whose node `id` is the full path, so a selection travels into
`?path=` unchanged.

- It walks the realm's folders to exhaustion, bounded by pages only
  (`PATH_TREE_LIMIT`), never by the 300-id budget: a folder missing from a tree
  is unreachable.
- It expands the selected folder's ancestors itself (`buildPathTreeExpansion`),
  else a deep `?path=` link selects something invisible.
- `VCTree` is generic, so it is registered globally (like `VCTable`), and the
  kit theme imports `@vuecs/tree/style.css`; without it every level renders at
  the margin.
