# Provisioning

Provisioning allows you to declaratively define the initial state of your Authup instance:
users, roles, permissions, scopes, clients, and their relationships.

On every server startup, the provisioning system synchronizes the declared state into the database.
Built-in defaults (admin user, admin role, system permissions) are always applied first.
Your custom provisioning files are merged on top.

## Per-Realm System Clients

Every realm automatically gets three built-in, public OAuth2 clients:

| Name              | Used by                                                          |
|-------------------|------------------------------------------------------------------|
| `web`             | Your own applications embedding `@authup/client-web-kit`         |
| `admin-console`   | Authup's admin console: selecting a realm on its login screen redirects the browser to `/authorize?client_id=admin-console&realm_id=<id>` |
| `account-console` | Authup's account self-service surface (upcoming; the client is provisioned ahead of it) |

All three authenticate end users via the authorization-code flow with PKCE.
Splitting them keeps concerns separate per application: sessions and audit
events carry the client they were issued for, and an access policy bound to
`admin-console` restricts who may newly log in to the admin console without
affecting logins of your own applications riding `web`. The policy gates
admission (the authorization-code flow and code redemption), not tokens that
were already issued.

The clients are provisioned for every existing realm on startup and for any
realm created at runtime. Provisioning is idempotent: re-runs refresh the
`redirectUri` allowlists but never duplicate anything.

Their attributes are fixed (identical for all three, except `name`):

| Attribute         | Value                                                              |
|-------------------|--------------------------------------------------------------------|
| `name`            | `web` / `admin-console` / `account-console`                        |
| `authMethod`      | `none` (public — no secret, PKCE required)                        |
| `tokenBindingMethod` | `none`                                                         |
| `builtIn`         | `true`                                                            |
| `grantTypes`      | `authorization_code refresh_token`                                |
| `scope`           | `global openid`                                                  |
| `active`          | `true`                                                            |
| `redirectUri`     | `<origin>/**` for every trusted app origin (see below)            |
| `postLogoutRedirectUri` | the same `<origin>/**` patterns                             |

Because the system clients are built-in and `builtIn` is stripped from any
client you create yourself, their names (and `system`) are reserved —
attempting to create or rename a client to one of them returns a
`400 Bad Request`.

::: tip Restricting the admin console
Binding an access policy to the `admin-console` client (its `accessPolicyId`)
denies new authorization-code admission (and code redemption) for the admin
console to identities that fail the policy. It is admission control, not
continuous enforcement: the `refresh_token` grant is not re-evaluated, so
already-issued refresh tokens keep working until they expire. To evict an
identity that was admitted before the policy changed, revoke its sessions
(`DELETE /sessions?filter[clientId]=...` or the sessions UI).

Two more caveats: the gate evaluates identity data only (realm, identity
type, time windows, compositions thereof); role-membership conditions are
not expressible there yet. And regular users currently use the admin
console's settings pages for password, MFA and session self-service, so a
restrictive policy locks them out of those until the dedicated account
surface ships.
:::

### Extending a system client

The attributes above are derived from configuration and are reasserted on
every start. Writing a different value to any of them, from a provisioning
file or through the API, is reverted at the next boot and no error is
raised. Redirect patterns in particular are configured through
`trustedOrigins` (below), not per client.

Every other attribute is left untouched and survives a restart —
`displayName` is seeded once at creation (`Web`, `Admin Console`,
`Account Console`) and then belongs to you. A provisioning file may
therefore declare a system client to set `displayName`, `description`,
`baseUrl`, `rootUrl` or `accessPolicyId`, and to assign additional roles,
permissions and scopes:

```yaml
realms:
    - attributes:
          name: master
      relations:
          clients:
              - attributes:
                    name: web
                    builtIn: true
                    displayName: Example Login
```

Scope assignments are additive. The built-in `global` and `openid` bindings
are re-created when missing, and nothing is ever removed. Declaring
`builtIn: true` is optional but keeps the first boot free of a takeover
warning, which is logged when a client on a reserved name is found without
the flag.

### Trusted app origins

The `redirectUri` allowlist is derived from the set of trusted app origins:
the origin of `publicUrl` plus every entry in `trustedOrigins`
(`TRUSTED_ORIGINS`). An entry may be a full http(s) origin
(`https://app.example.com`; other protocols are rejected) or a bare host
(`hub.local`, `hub.local:8080`) — a bare host expands to both its http and
https origin; pass a full origin to restrict to one scheme. Each origin contributes one `<origin>/**` redirect
pattern. (CORS is independent of this list — the API reflects any origin by
default, since OAuth2 clients are registered at runtime on domains unknown at
startup; an explicit allowlist can be configured via the `middlewareCors`
options.)

::: danger Security
The system clients are built-in with the `global` scope, so **any** allowlisted
origin can complete a login and obtain a full-permission token. Only add
origins you fully control to `trustedOrigins`. In non-production, the
client-admin-console dev origin (`http://localhost:3000`) is seeded automatically so
the realm-selection login works out of the box; in production nothing is
seeded — set `trustedOrigins` explicitly for any UI origin other than
`publicUrl`.
:::

## File-Based Provisioning

Place one or more provisioning files in the `provisioning/` subdirectory of the writable directory.
The writable directory defaults to `./writable` (relative to the application root) and can be configured
via the `WRITABLE_DIRECTORY_PATH` environment variable.

Supported formats: `.json`, `.yaml`, `.yml`, `.ts`, `.mts`, `.mjs`, `.js`.

When multiple files exist in the directory, they are loaded alphabetically and merged.
If two files define the same entity (same `name` + scope), the later file wins.

Provisioning files are **validated on load** with the same field rules the API
enforces on entity creation: an invalid entity (missing or malformed `name`,
invalid `email`, unknown policy `type`, ...) aborts startup with a validation
error instead of being silently provisioned. Identifier fields are
canonicalized (trimmed and lowercased), and attribute keys that are not part
of the entity's schema are stripped. Unlike the API, provisioning files may
set `builtIn: true` on policies, permissions, scopes, roles, realms, and
clients, and a user's `email` is optional (a placeholder is generated).

Attribute keys use **camelCase** (`realmId`, `displayName`, `authMethod`, …).
Snake_case keys (`realm_id`, `display_name`, …) are not accepted — unmounted
keys are stripped by the validator, so a stale snake_case key is silently
dropped. Write provisioning files in camelCase.

### Docker / Kubernetes

Mount your provisioning files into the container's writable directory:

```bash
docker run -v /path/to/provisioning:/opt/authup/writable/provisioning authup/authup
```

Or set the writable directory explicitly:

```bash
docker run \
  -e WRITABLE_DIRECTORY_PATH=/data \
  -v /path/to/provisioning:/data/provisioning \
  authup/authup
```

### Example (TypeScript)

```typescript
// provisioning/seed.ts
export default {
    permissions: [
        { attributes: { name: 'project_read' } },
        { attributes: { name: 'project_write' } },
    ],
    roles: [
        {
            attributes: { name: 'project-manager' },
            relations: {
                globalPermissions: ['project_read', 'project_write'],
            },
        },
    ],
    realms: [
        {
            attributes: { name: 'acme' },
            relations: {
                users: [
                    {
                        attributes: { name: 'alice', password: 'changeme' },
                        relations: { globalRoles: ['project-manager'] },
                    },
                ],
                clients: [
                    {
                        attributes: { name: 'acme-app', authMethod: 'secret', secret: 'my-secret' },
                        relations: { globalPermissions: ['*'] },
                    },
                ],
            },
        },
    ],
};
```

### Example (YAML)

```yaml
# provisioning/seed.yaml
permissions:
  - attributes:
      name: project_read
  - attributes:
      name: project_write

roles:
  - attributes:
      name: project-manager
    relations:
      globalPermissions:
        - project_read
        - project_write

realms:
  - attributes:
      name: acme
    relations:
      users:
        - attributes:
            name: alice
            password: changeme
          relations:
            globalRoles:
              - project-manager
```

## Schema Reference

### Root

The top-level object has five optional arrays. Items at this level are **global** (not scoped to any realm).

| Field         | Type                          | Description               |
|---------------|-------------------------------|---------------------------|
| `policies`    | `PolicyProvisioning[]`        | Global policies           |
| `permissions` | `PermissionProvisioning[]`    | Global permissions        |
| `scopes`      | `ScopeProvisioning[]`         | Global scopes             |
| `roles`       | `RoleProvisioning[]`          | Global roles              |
| `realms`      | `RealmProvisioning[]`         | Realms with nested entities |

### Policy

| Field              | Type                     | Description                          |
|--------------------|--------------------------|--------------------------------------|
| `attributes`       | object                   | `name` (required), `type`, `builtIn`, `realmId` |
| `extraAttributes`  | object                   | Policy-specific configuration (e.g. `decisionStrategy`, `attributeName`) |
| `children`         | `PolicyProvisioning[]`   | Child policies (for composite policies) |

### Policy Extra Attributes

Policies use `extraAttributes` for their type-specific configuration. All attribute keys use **camelCase** (the policy `type` values, e.g. `realm_match`, remain snake_case — they are enum values, not property keys).

| Policy Type | Attribute | Type | Description |
|---|---|---|---|
| `composite` | `decisionStrategy` | `string` | `unanimous` or `affirmative` |
| `realm_match` | `attributeName` | `string[]` | Entity attributes to match against identity realm |
| `realm_match` | `attributeNameStrict` | `boolean` | Require all listed attributes to match |
| `realm_match` | `identityMasterMatchAll` | `boolean` | Whether master realm identities bypass realm checks |
| `realm_match` | `attributeNullMatchAll` | `boolean` | Whether `null` attribute values match any realm |
| `attributes` | `query` | `object` | MongoDB-style query (e.g. `{ realmId: { $ne: null } }`) |
| `time` | `start` | `string` | ISO 8601 start datetime |
| `time` | `end` | `string` | ISO 8601 end datetime |

Example — defining a realm-match policy with custom settings:

```yaml
policies:
  - attributes:
      name: system.realm-match
      type: realm_match
      builtIn: true
    extraAttributes:
      attributeName:
        - realmId
      attributeNameStrict: false
      identityMasterMatchAll: false
      attributeNullMatchAll: true
```

::: warning Upgrading from a pre-camelCase release
Policy `extraAttributes` persisted **before** the camelCase release — both the attribute keys and
the entity-property names referenced inside `names`, `query`, and `attributeName` — are **not**
migrated automatically; the data migration deliberately leaves `auth_policy_attributes` untouched.
Built-in `system.*` policies self-heal (the provisioner rewrites them to camelCase on every
startup), but **user-authored** policies do not.

A stale `snake_case` policy silently changes meaning:

- an `invert: true` `attribute_names` denylist (e.g. `["name_locked", "status_message"]`) or an
  `invert: true` `attributes` policy (e.g. `{ realm_id: … }`) **fails open** — the camelCase
  attribute keys no longer match, so the deny never fires;
- a non-inverted `attributes` / attribute-mode `realm_match` constraint **stops matching** (denying
  legitimate access, or silently dropping the realm constraint).

**Action:** after upgrading, re-save every custom (non-built-in) `attribute_names`, `attributes`, or
attribute-mode `realm_match` policy — via `PUT /policies/:id`, the admin UI, or a provisioning
`replace` — using camelCase field references. Re-saving re-serializes the stored configuration under
the current contract and restores the intended decision.
:::

### Permission

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `description`, `displayName` |

### Scope

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `description`, `displayName` |

### Role

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `description`, `displayName` |
| `relations`  | object             | See below                            |

**Role relations:**

| Field                          | Type       | Description                                                                          |
|--------------------------------|------------|--------------------------------------------------------------------------------------|
| `globalPermissions`                | `string[]`              | Permission names to assign (global scope). `'*'` = all.                             |
| `globalPermissionsExclude`         | `string[]`              | Permission names to exclude when using `'*'` wildcard in `globalPermissions`.        |
| `globalPermissionsRealmScope`      | `string`                | Default `realmScope` (`own`, `ownOrNull`, `any`) stamped on each `globalPermissions` junction entry. |
| `globalPermissionsRealmScopeOverrides` | `Record<string, string[]>` | Per-permission `realmScope` overrides. Key = `realmScope` value, value = permission names. |
| `realmPermissions`                 | `string[]`              | Permission names to assign (realm scope). `'*'` = all.                              |

### Realm

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `description`, `displayName` |
| `relations`  | object             | See below                            |

**Realm relations** (all optional):

| Field         | Type                          | Description                      |
|---------------|-------------------------------|----------------------------------|
| `permissions` | `PermissionProvisioning[]`    | Realm-scoped permissions         |
| `scopes`      | `ScopeProvisioning[]`         | Realm-scoped scopes              |
| `roles`       | `RoleProvisioning[]`          | Realm-scoped roles               |
| `users`       | `UserProvisioning[]`          | Users in this realm              |
| `clients`     | `ClientProvisioning[]`        | OAuth2 clients in this realm     |

### User

Users must be nested inside a realm.

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `email`, `password`, `active`, `displayName` |
| `relations`  | object             | See below                            |

If `email` is omitted, a placeholder is generated automatically.

**User relations:**

| Field               | Type                       | Description                                                   |
|---------------------|----------------------------|---------------------------------------------------------------|
| `globalPermissions` | `string[]`                 | Global permission names. `'*'` = all.                        |
| `realmPermissions`  | `string[]`                 | Realm permission names. `'*'` = all.                         |
| `clientPermissions` | `Record<string, string[]>` | Key = client name, value = permission names. `'*'` = all.    |
| `globalRoles`       | `string[]`                 | Global role names. `'*'` = all.                              |
| `realmRoles`        | `string[]`                 | Realm role names. `'*'` = all.                               |
| `clientRoles`       | `Record<string, string[]>` | Key = client name, value = role names. `'*'` = all.          |

### Client

Clients (OAuth2 applications) must be nested inside a realm.

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `authMethod`, `tokenBindingMethod`, `secret`, `displayName`, `redirectUri` |
| `relations`  | object             | See below                            |

**Client relations:**

| Field               | Type                          | Description                                              |
|---------------------|-------------------------------|----------------------------------------------------------|
| `permissions`       | `PermissionProvisioning[]`    | Define new client-scoped permissions                     |
| `roles`             | `RoleProvisioning[]`          | Define new client-scoped roles                           |
| `globalPermissions` | `string[]`                    | Assign global permissions. `'*'` = all.                 |
| `realmPermissions`  | `string[]`                    | Assign realm permissions. `'*'` = all.                  |
| `globalRoles`       | `string[]`                    | Assign global roles. `'*'` = all.                       |
| `realmRoles`        | `string[]`                    | Assign realm roles. `'*'` = all.                        |
| `globalScopes`      | `string[]`                    | Assign global scopes. `'*'` = all.                      |
| `realmScopes`       | `string[]`                    | Assign realm scopes. `'*'` = all.                       |

Assigned scopes are what the authorization endpoint grants the client. A client
with none of them can only be authorized for requests that include the `global`
scope.

## Strategies

Each entity can declare a `strategy` that controls how it is synchronized on startup.
If omitted, `createOnly` is used by default.

### `createOnly` (default)

Creates the entity if it does not exist. Does nothing if it already exists.

```yaml
strategy:
  type: createOnly
```

### `merge`

Updates an existing entity. Optionally restrict which attributes are updated.

```yaml
# Update all attributes
strategy:
  type: merge

# Update only specific attributes
strategy:
  type: merge
  attributes:
    - description
    - displayName
```

### `replace`

Completely replaces the existing entity with the provisioned data.

```yaml
strategy:
  type: replace
```

### `absent`

Ensures the entity does **not** exist. If found, it is deleted.

```yaml
strategy:
  type: absent
```

## Wildcards

Use `'*'` in permission or role name arrays to assign **all** matching entities in that scope.

```yaml
roles:
  - attributes:
      name: superadmin
    relations:
      globalPermissions:
        - '*'       # assigns every global permission
      realmPermissions:
        - '*'       # assigns every permission in the same realm
```

Use `globalPermissionsExclude` to exclude specific permissions from a wildcard,
`globalPermissionsRealmScope` to set the default junction `realmScope`,
and `globalPermissionsRealmScopeOverrides` to override the scope for specific permissions:

```typescript
roles: [
    {
        attributes: { name: 'realm_admin', builtIn: true },
        relations: {
            globalPermissions: ['*'],
            globalPermissionsExclude: ['realm_create', 'realm_update', 'realm_delete'],
            globalPermissionsRealmScope: 'own',
            globalPermissionsRealmScopeOverrides: {
                ownOrNull: [
                    'role_read', 'permission_read', 'scope_read', 'policy_read',
                ],
            },
        },
    },
],
```

This creates a `realm_admin` role that:
- Has all permissions except realm management
- Defaults to `system.realm-or-global` — can read global entities and assign them to own-realm entities
- Overrides to `system.realm-bound` for entity CUD — cannot create/modify/delete global roles, permissions, or scopes

## Merging Behavior

When multiple provisioning files (or sources) define the same entity, the **last one wins**.
Entity identity is determined by the composite key: `name` + `realmId` + `clientId`.

The built-in defaults are always loaded first, so your files can override default entities
using the `merge` or `replace` strategy.

## Processing Order

Entities are synchronized in dependency order:

1. Policies (global)
2. Permissions (global)
3. Roles (global, with permission assignments)
4. Scopes (global)
5. Realms, then for each realm:
   1. Clients (with nested permissions/roles)
   2. Permissions (realm-scoped)
   3. Roles (realm-scoped, with permission assignments)
   4. Users (with permission/role assignments)
   5. Scopes (realm-scoped)

Define entities before referencing them. For example, create a permission before assigning it to a role.
