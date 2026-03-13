# Provisioning

Provisioning allows you to declaratively define the initial state of your Authup instance:
users, roles, permissions, scopes, clients, robots, and their relationships.

On every server startup, the provisioning system synchronizes the declared state into the database.
Built-in defaults (admin user, admin role, system permissions) are always applied first.
Your custom provisioning files are merged on top.

## File-Based Provisioning

Place one or more provisioning files in a directory and point the server to it.
Supported formats: `.json`, `.yaml`, `.yml`, `.ts`, `.mts`, `.mjs`, `.js`.

When multiple files exist in the directory, they are loaded alphabetically and merged.
If two files define the same entity (same `name` + scope), the later file wins.

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
                        attributes: { name: 'acme-app', is_confidential: true, secret: 'my-secret' },
                        relations: { globalPermissions: ['*'] },
                    },
                ],
                robots: [
                    {
                        attributes: { name: 'ci-bot', secret: 'bot-secret' },
                        relations: { globalPermissions: ['project_read'] },
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

The top-level object has four optional arrays. Items at this level are **global** (not scoped to any realm).

| Field         | Type                          | Description               |
|---------------|-------------------------------|---------------------------|
| `permissions` | `PermissionProvisioning[]`    | Global permissions        |
| `scopes`      | `ScopeProvisioning[]`         | Global scopes             |
| `roles`       | `RoleProvisioning[]`          | Global roles              |
| `realms`      | `RealmProvisioning[]`         | Realms with nested entities |

### Permission

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `description`, `display_name` |

### Scope

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `description`, `display_name` |

### Role

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `description`, `display_name` |
| `relations`  | object             | See below                            |

**Role relations:**

| Field               | Type       | Description                                              |
|---------------------|------------|----------------------------------------------------------|
| `globalPermissions` | `string[]` | Permission names to assign (global scope). `'*'` = all. |
| `realmPermissions`  | `string[]` | Permission names to assign (realm scope). `'*'` = all.  |

### Realm

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `description`, `display_name` |
| `relations`  | object             | See below                            |

**Realm relations** (all optional):

| Field         | Type                          | Description                      |
|---------------|-------------------------------|----------------------------------|
| `permissions` | `PermissionProvisioning[]`    | Realm-scoped permissions         |
| `scopes`      | `ScopeProvisioning[]`         | Realm-scoped scopes              |
| `roles`       | `RoleProvisioning[]`          | Realm-scoped roles               |
| `users`       | `UserProvisioning[]`          | Users in this realm              |
| `clients`     | `ClientProvisioning[]`        | OAuth2 clients in this realm     |
| `robots`      | `RobotProvisioning[]`         | Robot accounts in this realm     |

### User

Users must be nested inside a realm.

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `email`, `password`, `active`, `display_name` |
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
| `attributes` | object             | `name` (required), `secret`, `is_confidential`, `display_name`, `redirect_uri` |
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

### Robot

Robot (service) accounts must be nested inside a realm.

| Field        | Type               | Description                          |
|--------------|--------------------|--------------------------------------|
| `strategy`   | `Strategy`         | Sync strategy (optional)             |
| `attributes` | object             | `name` (required), `secret`, `active`, `display_name` |
| `relations`  | object             | See below                            |

**Robot relations:**

| Field               | Type       | Description                                              |
|---------------------|------------|----------------------------------------------------------|
| `globalPermissions` | `string[]` | Global permission names. `'*'` = all.                   |
| `realmPermissions`  | `string[]` | Realm permission names. `'*'` = all.                    |
| `globalRoles`       | `string[]` | Global role names. `'*'` = all.                         |
| `realmRoles`        | `string[]` | Realm role names. `'*'` = all.                          |

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
    - display_name
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

## Merging Behavior

When multiple provisioning files (or sources) define the same entity, the **last one wins**.
Entity identity is determined by the composite key: `name` + `realm_id` + `client_id`.

The built-in defaults are always loaded first, so your files can override default entities
using the `merge` or `replace` strategy.

## Processing Order

Entities are synchronized in dependency order:

1. Permissions (global)
2. Roles (global, with permission assignments)
3. Scopes (global)
4. Realms, then for each realm:
   1. Clients (with nested permissions/roles)
   2. Permissions (realm-scoped)
   3. Roles (realm-scoped, with permission assignments)
   4. Users (with permission/role assignments)
   5. Robots (with permission/role assignments)
   6. Scopes (realm-scoped)

Define entities before referencing them. For example, create a permission before assigning it to a role.
