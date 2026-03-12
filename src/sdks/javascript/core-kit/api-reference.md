# Resource Domain

## `Client`

**Type**
```typescript
import { User } from '@authup/core-kit';

interface Client {
    id: string,

    name: string,

    description: string | null,

    secret: string,

    redirect_url: string | null,

    grant_types: string | null,

    scope: string | null,

    base_url: string | null,

    root_url: string | null,

    is_confidential: boolean

    // ------------------------------------------------------------------

    realm_id: Realm['id'],

    realm: Realm,
    
    user_id: User['id'] | null,

    user: User | null
}
```

**References**
- [Realm](#realm)
- [User](#user)

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

    slug: string;

    protocol: `${IdentityProviderProtocol}` | null;

    preset: `${IdentityProviderPreset}` | null;

    enabled: boolean;

    created_at: Date | string;

    updated_at: Date | string;

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

    access_token: string;

    refresh_token: string;

    provider_user_id: string;

    provider_user_name: string;

    provider_user_email: string;

    expires_in: number;

    expires_at: Date;

    created_at: Date;

    updated_at: Date;

    // -----------------------------------------------

    user_id: string;

    user: User;

    provider_id: string;

    provider: IdentityProvider;
}
```
**References**
- [IdentityProvider](#identityprovider)
- [Realm](#realm)
- [User](#user)

## `IdentityProviderRole`

**Type**
```typescript
import { 
    IdentityProvider,
    Realm, 
    Role
} from '@authup/core-kit';

interface IdentityProviderRole {
    id: string;

    external_id: string;

    created_at: Date;

    updated_at: Date;

    // -----------------------------------------------

    role_id: string;

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;

    provider_id: string;

    provider: IdentityProvider;

    provider_realm_id: Realm['id'] | null;

    provider_realm: Realm | null;
}
```

**References**
- [IdentityProvider](#identityprovider)
- [Realm](#realm)
- [Role](#role)

## `Permission`

**Type**
```typescript
interface Permission {
    id: string;

    target: string | null;

    created_at: Date;

    updated_at: Date;
}
```

## `PermissionRelation`

**Type**
```typescript
import { Permission } from '@authup/core-kit';

interface PermissionRelation {
    power: number;

    condition: string | null;

    fields: string | null;

    negation: boolean;

    target: string | null;

    // ------------------------------------------------------------------

    permission_id: Permission['id'];

    permission: Permission;
}
```

## `Realm`

**Type**
```typescript
interface Realm {
    id: string;

    name: string;

    description: string | null;

    built_in: boolean;

    created_at: string;

    updated_at: string;
}
```

## `Robot`

**Type**
```typescript
import { Realm, User } from '@authup/core-kit';

interface Robot {
    id: string;

    secret: string;

    name: string;

    description: string;

    active: boolean;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    user_id: User['id'] | null;

    user: User | null;

    realm_id: Realm['id'];

    realm: Realm;
}
```

**References**
- [Realm](#realm)
- [User](#user)

## `RobotPermission`

**Type**
```typescript
import { PermissionRelation, Realm, Robot } from '@authup/core-kit';

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
import { Realm, Role } from '@authup/core-kit';

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
- [Role](#role)

## `Role`

**Type**
```typescript
import { Realm } from '@authup/core-kit';

interface Role {
    id: string;

    name: string;

    target: string | null;

    description: string | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}

```

## `RoleAttribute`

**Type**
```typescript
import { Realm, Role } from '@authup/core-kit';

interface RoleAttribute {
    id: string;

    key: string;

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
import { Realm } from '@authup/core-kit';

interface User {
    id: string;

    name: string;

    name_locked: boolean;

    first_name: string | null;

    last_name: string | null;

    display_name: string;

    email: string | null;

    password: string | null;

    // ------------------------------------------------------------------

    avatar: string | null;

    cover: string | null;

    // ------------------------------------------------------------------

    reset_hash: string | null;

    reset_at: Date | null;

    reset_expires: Date | null;

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

    realm_id: string;

    realm: Realm;

    // extra user attributes :)
    extra?: Record<string, any>;
}
```

**References**
- [Realm](#realm)

## `UserAttribute`

**Type**
```typescript
import { Realm, User } from '@authup/core-kit';

interface UserAttribute {
    id: string;

    key: string;

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
