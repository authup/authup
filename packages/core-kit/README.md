<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/core-kit</h1>

<p align="center">
    <b>Domain types, enums and validators for every Authup entity, shared by server and clients.</b><br>
    The shapes of users, clients, roles, permissions and realms, and the rules their fields follow.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/core-kit"><img src="https://img.shields.io/npm/v/@authup/core-kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

`@authup/core-kit` is the domain layer every other Authup workspace builds on: the server validates incoming payloads with its validators, [`@authup/core-http-kit`](https://github.com/authup/authup/tree/master/packages/core-http-kit) types its responses with its entities, and the Vue kit renders its forms against the same rules. You install it directly when you write TypeScript against Authup and need the entity types or the permission and scope names, for example to type your own API layer or to check `permission.name === PermissionName.USER_UPDATE` without a string literal. If you already use `@authup/core-http-kit`, it is installed with it.

## Installation

```shell
npm install @authup/core-kit
```

ESM only. Node.js `>=26.0.0`, or a browser bundler. There are no peer dependencies.

## Usage

### Entity types

Every entity is a plain type with camelCase fields:

```typescript
import type { Role, User } from '@authup/core-kit';

function label(user: User) : string {
    return user.displayName ?? user.name;
}

const role: Pick<Role, 'name' | 'realmId'> = { name: 'editor', realmId: null };
```

`EntityType` names every entity (`EntityType.USER === 'user'`, `EntityType.ROLE_PERMISSION === 'rolePermission'`), and `EntityTypeMap` maps each name to its type.

### Names and enums

```typescript
import {
    IdentityType,
    PermissionName,
    REALM_MASTER_NAME,
    ROLE_ADMIN_NAME,
    ScopeName,
} from '@authup/core-kit';

PermissionName.USER_UPDATE; // 'user_update'
ScopeName.GLOBAL; // 'global'
IdentityType.CLIENT; // 'client'
REALM_MASTER_NAME; // 'master'
ROLE_ADMIN_NAME; // 'admin'
```

`PermissionName` lists the built-in permissions the server provisions; `ScopeName` the built-in scopes (`global`, `openid`, `email`, `roles`, `identity`).

### Validators

Each writable entity has a validator, a [validup](https://github.com/tada5hi/validup) container. `run()` returns the validated and normalized data, or throws a `ValidupError` listing the issues:

```typescript
import { RoleValidator } from '@authup/core-kit';
import { ValidatorGroup } from '@authup/kit';

const validator = new RoleValidator();
const data = await validator.run(
    { name: '  Editor ', description: 'Edits content' },
    { group: ValidatorGroup.CREATE },
);
// data.name === 'editor'
```

- The group decides which fields are mounted. `CREATE` mounts identifiers such as `name` and `realmId`; `UPDATE` does not mount `realmId`, so a realm cannot change after creation. `ValidatorGroup` comes from `@authup/kit`.
- Fields a group does not mount are stripped from the output, not rejected.
- Names are canonicalized: `name` is trimmed and lower-cased before the format check, so mixed case is accepted and stored lower case.

### Name checks

```typescript
import { isNameValid, isUserNameValid } from '@authup/core-kit';

isNameValid('my-app_1'); // true
isNameValid('My App'); // false
isNameValid('My App', { throwOnFailure: true }); // throws
isUserNameValid('alice');
```

`isNameValid` accepts `[a-z0-9-_.]` only. Each entity adds its own variant (`isRoleNameValid`, `isClientNameValid`, `isRealmNameValid`, ...) with its own reserved names and length bounds.

## API

The barrel exports one family per entity. Each family carries the entity type and, where the entity is writable, a validator, a name check and its constants.

| Family | Main exports |
|---|---|
| Users | `User`, `UserValidator`, `isUserNameValid`, `isValidUserEmail`, `USER_PASSWORD_MIN_LENGTH`, `USER_PASSWORD_MAX_LENGTH` |
| User relations | `UserAttribute`, `UserAttributeName`, `UserAuthenticator`, `UserAuthenticatorKind`, `UserPermission`, `UserRole` and their validators |
| Clients | `Client`, `ClientValidator`, `ClientSecretRotateValidator`, `ClientAuthMethod`, `ClientSecretMode`, `ClientTokenBindingMethod`, `CLIENT_SYSTEM_NAME`, `CLIENT_ADMIN_CONSOLE_NAME`, `CLIENT_ACCOUNT_CONSOLE_NAME`, `CLIENT_RESERVED_NAMES`, `isClientPublic`, `getClientSecretMode` |
| Client relations | `ClientPermission`, `ClientRole`, `ClientScope` and their validators |
| Roles | `Role`, `RoleValidator`, `RoleAttribute`, `RolePermission`, `ROLE_ADMIN_NAME`, `ROLE_REALM_ADMIN_NAME` |
| Permissions and policies | `Permission`, `PermissionName`, `PermissionValidator`, `PermissionPolicy`, `Policy`, `PolicyValidator`, `PolicyAttribute`, `REALM_SCOPE` |
| Scopes | `Scope`, `ScopeName`, `ScopeValidator` |
| Realms | `Realm`, `RealmValidator`, `REALM_MASTER_NAME`, `isRealmNameValid` |
| Paths | `Path`, `PathValidator`, `splitPath`, `joinPath`, `isPathValid`, `PATH_MAX_DEPTH` |
| Identity providers | `IdentityProvider`, `IdentityProviderProtocol`, `IdentityProviderPreset`, `IdentityProviderValidator`, the OAuth2, OIDC and LDAP attribute validators, `IdentityProviderAccount`, the attribute, role and permission mappings |
| Sessions and consent | `Session`, `SessionAuthMethod`, `SessionToken`, `Consent`, `OAuth2AuthorizationCode` |
| Keys | `Key`, `KeyStatus`, `KeyValidator`, `TrustAnchor`, `TrustAnchorValidator` |
| Events | `Event`, `EventName`, `EventScope`, `EventRefType`, `EventAggregate` |
| Identities | `Identity`, `UserIdentity`, `ClientIdentity`, `IdentityType` |
| Cross-entity | `EntityType`, `EntityTypeMap`, `EntityDefaultEventName`, `isNameValid`, `buildEntityChannelName`, `buildEntityNamespaceName` |

The full reference is at [authup.org](https://authup.org).

## Notes

- **Types describe the API shape, not the database.** Fields the server never returns (a password, a secret in hashed mode) may still appear on the type as optional or nullable.
- **`EntityTypeMap` is not every `EntityType`.** A few types (the identity-provider attribute and permission mappings, the user authenticator) have no entry, since no flat entity API serves them.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
