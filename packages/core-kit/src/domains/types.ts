/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from './client/index.ts';
import type { ClientPermission } from './client-permission/index.ts';
import type { ClientRole } from './client-role/index.ts';
import type { ClientScope } from './client-scope/index.ts';
import type { ClientTokenExchangeCapability } from './client-token-exchange-capability/index.ts';
import type { Consent } from './consent/index.ts';
import type { EntityType } from './contstants.ts';
import type { Event } from './event/index.ts';
import type { IdentityProvider } from './identity-provider/index.ts';
import type { IdentityProviderAccount } from './identity-provider-account/index.ts';
import type { IdentityProviderAttribute } from './identity-provider-attribute/index.ts';
import type { IdentityProviderRoleMapping } from './identity-provider-role-mapping/index.ts';
import type { Key } from './key/index.ts';
import type { Path } from './path/index.ts';
import type { Permission } from './permission/index.ts';
import type { PermissionPolicy } from './permission-policy/index.ts';
import type { Policy } from './policy/index.ts';
import type { PolicyAttribute } from './policy-attribute/index.ts';
import type { Realm } from './realm/index.ts';
import type { Role } from './role/index.ts';
import type { RoleAttribute } from './role-attribute/index.ts';
import type { RolePermission } from './role-permission/index.ts';
import type { Scope } from './scope/index.ts';
import type { Session } from './session/index.ts';
import type { SessionToken } from './session-token/index.ts';
import type { TrustAnchor } from './trust-anchor/index.ts';
import type { User } from './user/index.ts';
import type { UserAttribute } from './user-attribute/index.ts';
import type { UserPermission } from './user-permission/index.ts';
import type { UserRole } from './user-role/index.ts';

type EntityTypeMapRaw = {
    [EntityType.CLIENT]: Client,
    [EntityType.CLIENT_PERMISSION]: ClientPermission,
    [EntityType.CLIENT_ROLE]: ClientRole,
    [EntityType.CLIENT_SCOPE]: ClientScope,
    [EntityType.CLIENT_TOKEN_EXCHANGE_CAPABILITY]: ClientTokenExchangeCapability,
    [EntityType.CONSENT]: Consent,
    [EntityType.EVENT]: Event,
    [EntityType.IDENTITY_PROVIDER]: IdentityProvider,
    [EntityType.IDENTITY_PROVIDER_ACCOUNT]: IdentityProviderAccount,
    [EntityType.IDENTITY_PROVIDER_ATTRIBUTE]: IdentityProviderAttribute,
    [EntityType.IDENTITY_PROVIDER_ROLE_MAPPING]: IdentityProviderRoleMapping,
    [EntityType.KEY]: Key,
    [EntityType.PATH]: Path,
    [EntityType.POLICY]: Policy,
    [EntityType.POLICY_ATTRIBUTE]: PolicyAttribute,
    [EntityType.PERMISSION]: Permission,
    [EntityType.PERMISSION_POLICY]: PermissionPolicy,
    [EntityType.REALM]: Realm,
    [EntityType.ROLE]: Role,
    [EntityType.ROLE_ATTRIBUTE]: RoleAttribute,
    [EntityType.ROLE_PERMISSION]: RolePermission,
    [EntityType.SCOPE]: Scope,
    [EntityType.SESSION]: Session,
    [EntityType.SESSION_TOKEN]: SessionToken,
    [EntityType.TRUST_ANCHOR]: TrustAnchor,
    [EntityType.USER]: User,
    [EntityType.USER_ATTRIBUTE]: UserAttribute,
    [EntityType.USER_PERMISSION]: UserPermission,
    [EntityType.USER_ROLE]: UserRole,
};

export type EntityTypeMap = {
    [K in keyof EntityTypeMapRaw as `${K}`]: EntityTypeMapRaw[K]
};

export type EventRecord<
    T extends string,
    D extends Record<string, any>,
> = {
    type: T,
    data: D,
    event: string,
};
