# Domains

## `OAuth2AccessToken`

**Type**
```typescript
import { OAuth2Client, Robot, User } from '@authelion/common';

interface OAuth2AccessToken {
    id: string,

    content: string,

    client_id: OAuth2Client['id'] | null,

    client: OAuth2Client | null,

    user_id: User['id'] | null,

    user: User | null,

    robot_id: Robot['id'] | null,

    robot: Robot | null,

    realm_id: Realm['id'],

    realm: Realm,

    expires: Date,

    scope: string | null
}
```

**References**
- [OAuth2Client](#oauth2client)
- [Robot](#robot)
- [User](#user)

## `OAuth2Client`

**Type**
```typescript
import { User } from '@authelion/common';

interface OAuth2Client {
    id: string,

    secret: string,

    redirect_url: string | null,

    grant_types: string | null,

    scope: string | null,

    is_confidential: boolean

    // ------------------------------------------------------------------

    user_id: User['id'] | null,

    user: User | null
}
```

**References**
- [User](#user)

## `OAuth2Provider`

**Type**
```typescript
import { Realm } from '@authelion/common';

interface OAuth2Provider {
    id: string;

    name: string;

    open_id: boolean;

    client_id: string;

    client_secret: string;

    token_host: string;

    token_path: string;

    token_revoke_path: string;

    authorize_host: string;

    authorize_path: string;

    user_info_host: string;

    user_info_path: string;

    scope: string;

    created_at: Date;

    updated_at: Date;

    realm_id: string;

    realm: Realm;
}
```

**References**
- [Realm](#realm)

## `OAuth2ProviderAccount`

**Type**
```typescript
import { OAuth2Provider, User } from '@authelion/common';

interface OAuth2ProviderAccount {
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

    provider: OAuth2Provider;
}
```
**References**
- [OAuth2Provider](#oauth2provider)
- [User](#user)

## `OAuth2ProviderRole`

**Type**
```typescript
import { OAuth2Provider, Role } from '@authelion/common';

interface OAuth2ProviderRole {
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

    provider: OAuth2Provider;

    provider_realm_id: Realm['id'] | null;

    provider_realm: Realm | null;
}
```

**References**
- [OAuth2Provider](#oauth2provider)
- [Role](#role)

## `OAuth2RefreshToken`

**Type**
```typescript
import { OAuth2AccessToken, OAuth2Client, Realm } from '@authelion/common';

interface OAuth2RefreshToken {
    id: string;

    expires: Date;

    scope: string | null;

    // ------------------------------------------------------------------

    client_id: OAuth2Client['id'] | null;

    client: OAuth2Client | null;

    access_token_id: OAuth2AccessToken['id'] | null;

    access_token: OAuth2AccessToken | null;

    realm_id: Realm['id'];

    realm: Realm;
}
```

**References**
- [OAuth2AccessToken](#oauth2accesstoken)
- [OAuth2Client](#oauth2client)
- [Realm](#realm)

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
import { Permission } from '@authelion/common';

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

    drop_able: boolean;

    created_at: string;

    updated_at: string;
}
```

## `Robot`

**Type**
```typescript
import { Realm, User } from '@authelion/common';

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
import { PermissionRelation, Realm, Robot } from '@authelion/common';

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
import { Realm, Role } from '@authelion/common';

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
import { Realm } from '@authelion/common';

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
import { Realm, Role } from '@authelion/common';

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
import { PermissionRelation, Realm, Role } from '@authelion/common';

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
import { Realm } from '@authelion/common';

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
import { Realm, User } from '@authelion/common';

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
import { PermissionRelation, Realm, User } from '@authelion/common';

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
import { Realm, Role, User } from '@authelion/common';

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
