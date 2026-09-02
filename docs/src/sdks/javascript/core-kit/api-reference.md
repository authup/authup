# Resource Domain

## `Client`

**Type**
```typescript
import { Policy, Realm } from '@authup/core-kit';

interface Client {
    id: string,

    // ------------------------------------------------------------------

    active: boolean;

    builtIn: boolean;

    authMethod: 'none' | 'secret' | 'tls',

    tokenBindingMethod: 'none' | 'tls',

    // ------------------------------------------------------------------

    name: string,

    displayName: string | null;

    description: string | null,

    // ------------------------------------------------------------------

    secret: string | null,

    secretHashed: boolean,

    secretEncrypted: boolean,

    // ------------------------------------------------------------------

    redirectUri: string | null,

    postLogoutRedirectUri: string | null,

    backchannelLogoutUri: string | null,

    grantTypes: string | null,

    baseUrl: string | null,

    // ------------------------------------------------------------------

    createdAt: string,

    updatedAt: string,

    // ------------------------------------------------------------------

    realmId: Realm['id'],

    realm: Realm,

    accessPolicyId: Policy['id'] | null,

    accessPolicy: Policy | null,
}
```

**References**
- [Policy](#policy)
- [Realm](#realm)

## `IdentityProvider`

**Type**
```typescript
import {
    IdentityProviderProtocol,
    IdentityProviderPreset,
    Realm
} from '@authup/core-kit';

interface IdentityProvider {
    id: string,

    name: string,

    displayName: string | null;

    protocol: `${IdentityProviderProtocol}` | null;

    preset: `${IdentityProviderPreset}` | null;

    enabled: boolean;

    createdAt: string;

    updatedAt: string;

    realmId: Realm['id'];

    realm: Realm;
}
```

**References**
- [IdentityProviderProtocol](#identityproviderprotocol)
- [IdentityProviderPreset](#identityproviderpreset)
- [Realm](#realm)

## `IdentityProviderProtocol`
**Type**
```typescript
enum IdentityProviderProtocol {
    LDAP = 'ldap',
    OAUTH2 = 'oauth2',
    OIDC = 'oidc',
}
```

## `IdentityProviderPreset`
**Type**
```typescript
enum IdentityProviderPreset {
    FACEBOOK = 'facebook',
    GITHUB = 'github',
    GITLAB = 'gitlab',
    GOOGLE = 'google',
    PAYPAL = 'paypal',
    INSTAGRAM = 'instagram',
    STACKOVERFLOW = 'stackoverflow',
    TWITTER = 'twitter',
}

```

## `IdentityProviderAccount`

**Type**
```typescript
import {
    IdentityProvider,
    Realm,
    User
} from '@authup/core-kit';

interface IdentityProviderAccount {
    id: string;

    providerUserId: string;

    providerUserName: string;

    providerUserEmail: string;

    createdAt: Date;

    updatedAt: Date;

    // -----------------------------------------------

    userId: string;

    user: User;

    userRealmId: Realm['id'] | null;

    userRealm: Realm | null;

    providerId: IdentityProvider['id'];

    provider: IdentityProvider;

    providerRealmId: Realm['id'] | null;

    providerRealm: Realm | null;
}
```
**References**
- [IdentityProvider](#identityprovider)
- [Realm](#realm)
- [User](#user)

## `IdentityProviderRoleMapping`

**Type**
```typescript
import {
    IdentityProviderBaseMapping,
    Realm,
    Role
} from '@authup/core-kit';

interface IdentityProviderRoleMapping extends IdentityProviderBaseMapping {
    id: string;

    createdAt: Date;

    updatedAt: Date;

    // -----------------------------------------------

    roleId: string;

    role: Role;

    roleRealmId: Realm['id'] | null;

    roleRealm: Realm | null;
}
```

**References**
- [IdentityProviderBaseMapping](#identityproviderbasemapping)
- [Realm](#realm)
- [Role](#role)

## `IdentityProviderBaseMapping`

**Type**
```typescript
import {
    IdentityProvider,
    IdentityProviderMappingSyncMode,
    Realm
} from '@authup/core-kit';

interface IdentityProviderBaseMapping {
    name: string | null;

    value: string | null;

    valueIsRegex: boolean;

    synchronizationMode: `${IdentityProviderMappingSyncMode}` | null;

    providerId: IdentityProvider['id'];

    provider: IdentityProvider;

    providerRealmId: Realm['id'];

    providerRealm: Realm;
}
```

**References**
- [IdentityProvider](#identityprovider)
- [IdentityProviderMappingSyncMode](#identityprovidermappingsyncmode)
- [Realm](#realm)

## `IdentityProviderMappingSyncMode`
**Type**
```typescript
enum IdentityProviderMappingSyncMode {
    ONCE = 'once',
    ALWAYS = 'always',
    INHERIT = 'inherit',
}
```

## `Policy`

**Type**
```typescript
import { PolicyWithType, Realm } from '@authup/core-kit';

interface Policy {
    id: string;

    builtIn: boolean;

    type: string;

    name: string;

    displayName: string | null;

    description: string | null;

    invert: boolean;

    children: PolicyWithType<Policy>[];

    parentId: Policy['id'] | null;

    parent: PolicyWithType<Policy> | null;

    // ------------------------------------------------------------------

    realmId: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
```

**References**
- [Realm](#realm)

## `Permission`

**Type**
```typescript
import { Client, Policy, Realm } from '@authup/core-kit';

interface Permission {
    id: string;

    builtIn: boolean;

    name: string;

    displayName: string | null;

    description: string | null;

    // ------------------------------------------------------------------

    policyId: Policy['id'] | null;

    policy: Policy | null;

    // ------------------------------------------------------------------

    clientId: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realmId: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
```

**References**
- [Client](#client)
- [Policy](#policy)
- [Realm](#realm)

## `PermissionRelation`

**Type**
```typescript
import { Permission, Policy, Realm } from '@authup/core-kit';

interface PermissionRelation {
    policyId: Policy['id'] | null;

    policy: Policy | null;

    permissionId: Permission['id'];

    permission: Permission;

    permissionRealmId: Realm['id'] | null;

    permissionRealm: Realm | null;
}
```

**References**
- [Permission](#permission)
- [Policy](#policy)
- [Realm](#realm)

## `Realm`

**Type**
```typescript
interface Realm {
    id: string;

    name: string;

    displayName: string | null;

    description: string | null;

    builtIn: boolean;

    createdAt: string;

    updatedAt: string;
}
```

## `Role`

**Type**
```typescript
import { Client, Realm } from '@authup/core-kit';

interface Role {
    id: string;

    builtIn: boolean;

    name: string;

    displayName: string | null;

    target: string | null;

    description: string | null;

    // ------------------------------------------------------------------

    clientId: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realmId: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}

```

**References**
- [Client](#client)
- [Realm](#realm)

## `RoleAttribute`

**Type**
```typescript
import { Realm, Role } from '@authup/core-kit';

interface RoleAttribute {
    id: string;

    name: string;

    value: string | null;

    // ------------------------------------------------------------------

    roleId: Role['id'];

    role: Role;

    realmId: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
```

**References**
- [Realm](#realm)
- [Role](#role)

## `RolePermission`

**Type**
```typescript
import { PermissionRelation, Realm, Role } from '@authup/core-kit';

interface RolePermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    createdAt: Date;

    updatedAt: Date;

    // ------------------------------------------------------------------

    roleId: string;

    role: Role;

    roleRealmId: Realm['id'] | null;

    roleRealm: Realm | null;
}
```

**References**
- [PermissionRelation](#permissionrelation)
- [Realm](#realm)
- [Role](#role)

## `User`

**Type**
```typescript
import { Client, Realm } from '@authup/core-kit';

interface User {
    id: string;

    name: string;

    nameLocked: boolean;

    firstName: string | null;

    lastName: string | null;

    displayName: string | null;

    email: string;

    emailVerified: boolean;

    password: string | null;

    // ------------------------------------------------------------------

    avatar: string | null;

    cover: string | null;

    // ------------------------------------------------------------------

    resetHash: string | null;

    resetAt: string | null;

    resetExpires: string | null;

    // ------------------------------------------------------------------

    status: string | null;

    statusMessage: string | null;

    // ------------------------------------------------------------------

    active: boolean;

    activateHash: string | null;

    // ------------------------------------------------------------------

    createdAt: Date;

    updatedAt: Date;

    // ------------------------------------------------------------------

    clientId: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realmId: Realm['id'];

    realm: Realm;

    // ------------------------------------------------------------------

    [key: string]: any
}
```

**References**
- [Client](#client)
- [Realm](#realm)

## `UserAttribute`

**Type**
```typescript
import { Realm, User } from '@authup/core-kit';

interface UserAttribute {
    id: string;

    name: string;

    value: string | null;

    // ------------------------------------------------------------------

    userId: User['id'];

    user: User;

    realmId: Realm['id'];

    realm: Realm;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
```

**References**
- [Realm](#realm)
- [User](#user)

## `UserPermission`

**Type**
```typescript
import { PermissionRelation, Realm, User } from '@authup/core-kit';

interface UserPermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    createdAt: Date;

    updatedAt: Date;

    // ------------------------------------------------------------------

    userId: User['id'];

    user: User;

    userRealmId: Realm['id'] | null;

    userRealm: Realm | null;
}
```

**References**
- [PermissionRelation](#permissionrelation)
- [Realm](#realm)
- [User](#user)

## `UserRole`

**Type**
```typescript
import { Realm, Role, User } from '@authup/core-kit';

interface UserRole {
    id: string;

    // ------------------------------------------------------------------

    roleId: Role['id'];

    role: Role;

    roleRealmId: Realm['id'] | null;

    roleRealm: Realm | null;

    userId: User['id'];

    user: User;

    userRealmId: Realm['id'] | null;

    userRealm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
```

**References**
- [Realm](#realm)
- [Role](#role)
- [User](#user)
