# Resource Domain

## `Client`

**Type**
```typescript
import { Realm } from '@authup/core-kit';

interface Client {
    id: string,

    // ------------------------------------------------------------------

    active: boolean;

    built_in: boolean;

    is_confidential: boolean,

    // ------------------------------------------------------------------

    name: string,

    display_name: string | null;

    description: string | null,

    // ------------------------------------------------------------------

    secret: string | null,

    secret_hashed: boolean,

    secret_encrypted: boolean,

    // ------------------------------------------------------------------

    redirect_uri: string | null,

    grant_types: string | null,

    scope: string | null,

    base_url: string | null,

    root_url: string | null,

    // ------------------------------------------------------------------

    created_at: string,

    updated_at: string,

    // ------------------------------------------------------------------

    realm_id: Realm['id'],

    realm: Realm,
}
```

**References**
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

    display_name: string | null;

    protocol: `${IdentityProviderProtocol}` | null;

    preset: `${IdentityProviderPreset}` | null;

    enabled: boolean;

    created_at: string;

    updated_at: string;

    realm_id: Realm['id'];

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

    provider_user_id: string;

    provider_user_name: string;

    provider_user_email: string;

    created_at: Date;

    updated_at: Date;

    // -----------------------------------------------

    user_id: string;

    user: User;

    user_realm_id: Realm['id'] | null;

    user_realm: Realm | null;

    provider_id: IdentityProvider['id'];

    provider: IdentityProvider;

    provider_realm_id: Realm['id'] | null;

    provider_realm: Realm | null;
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

    created_at: Date;

    updated_at: Date;

    // -----------------------------------------------

    role_id: string;

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;
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

    value_is_regex: boolean;

    synchronization_mode: `${IdentityProviderMappingSyncMode}` | null;

    provider_id: IdentityProvider['id'];

    provider: IdentityProvider;

    provider_realm_id: Realm['id'];

    provider_realm: Realm;
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

## `Permission`

**Type**
```typescript
import { Client, Policy, Realm } from '@authup/core-kit';

interface Permission {
    id: string;

    built_in: boolean;

    name: string;

    display_name: string | null;

    description: string | null;

    // ------------------------------------------------------------------

    policy_id: Policy['id'] | null;

    policy: Policy | null;

    // ------------------------------------------------------------------

    client_id: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
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
    policy_id: Policy['id'] | null;

    policy: Policy | null;

    permission_id: Permission['id'];

    permission: Permission;

    permission_realm_id: Realm['id'] | null;

    permission_realm: Realm | null;
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

    display_name: string | null;

    description: string | null;

    built_in: boolean;

    created_at: string;

    updated_at: string;
}
```

## `Robot`

**Type**
```typescript
import { Client, Realm, User } from '@authup/core-kit';

interface Robot {
    id: string;

    secret: string;

    name: string;

    display_name: string | null;

    description: string;

    active: boolean;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    user_id: User['id'] | null;

    user: User | null;

    // ------------------------------------------------------------------

    client_id: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'];

    realm: Realm;
}
```

**References**
- [Client](#client)
- [Realm](#realm)
- [User](#user)

## `RobotPermission`

**Type**
```typescript
import { PermissionRelation, Robot, Realm } from '@authup/core-kit';

interface RobotPermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    robot_id: string;

    robot: Robot;

    robot_realm_id: Realm['id'] | null;

    robot_realm: Realm | null;
}
```

**References**
- [PermissionRelation](#permissionrelation)
- [Realm](#realm)
- [Robot](#robot)

## `RobotRole`

**Type**
```typescript
import { Realm, Robot, Role } from '@authup/core-kit';

interface RobotRole {
    id: string;

    robot_id: string;

    role_id: string;

    // ------------------------------------------------------------------

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;

    robot: Robot;

    robot_realm_id: Realm['id'] | null;

    robot_realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}
```

**References**
- [Realm](#realm)
- [Robot](#robot)
- [Role](#role)

## `Role`

**Type**
```typescript
import { Client, Realm } from '@authup/core-kit';

interface Role {
    id: string;

    built_in: boolean;

    name: string;

    display_name: string | null;

    target: string | null;

    description: string | null;

    // ------------------------------------------------------------------

    client_id: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
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

    role_id: Role['id'];

    role: Role;

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
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

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    role_id: string;

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;
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

    name_locked: boolean;

    first_name: string | null;

    last_name: string | null;

    display_name: string | null;

    email: string;

    password: string | null;

    // ------------------------------------------------------------------

    avatar: string | null;

    cover: string | null;

    // ------------------------------------------------------------------

    reset_hash: string | null;

    reset_at: string | null;

    reset_expires: string | null;

    // ------------------------------------------------------------------

    status: string | null;

    status_message: string | null;

    // ------------------------------------------------------------------

    active: boolean;

    activate_hash: string | null;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    client_id: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'];

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

    user_id: User['id'];

    user: User;

    realm_id: Realm['id'];

    realm: Realm;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
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

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    user_id: User['id'];

    user: User;

    user_realm_id: Realm['id'] | null;

    user_realm: Realm | null;
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

    role_id: Role['id'];

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;

    user_id: User['id'];

    user: User;

    user_realm_id: Realm['id'] | null;

    user_realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}
```

**References**
- [Realm](#realm)
- [Role](#role)
- [User](#user)
