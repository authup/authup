/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from './client';
import type { ClientPermission } from './client-permission';
import type { ClientRole } from './client-role';
import type { ClientScope } from './client-scope';
import type { Consent } from './consent';
import type { EntityType } from './contstants';
import type { Event } from './event';
import type { IdentityProvider } from './identity-provider';
import type { IdentityProviderAccount } from './identity-provider-account';
import type { IdentityProviderAttribute } from './identity-provider-attribute';
import type { IdentityProviderRoleMapping } from './identity-provider-role-mapping';
import type { Key } from './key';
import type { Permission } from './permission';
import type { PermissionPolicy } from './permission-policy';
import type { Policy } from './policy';
import type { PolicyAttribute } from './policy-attribute';
import type { Realm } from './realm';
import type { Role } from './role';
import type { RoleAttribute } from './role-attribute';
import type { RolePermission } from './role-permission';
import type { Scope } from './scope';
import type { Session } from './session';
import type { SessionToken } from './session-token';
import type { TrustAnchor } from './trust-anchor';
import type { User } from './user';
import type { UserAttribute } from './user-attribute';
import type { UserPermission } from './user-permission';
import type { UserRole } from './user-role';

type EntityTypeMapRaw = {
    [EntityType.CLIENT]: Client,
    [EntityType.CLIENT_PERMISSION]: ClientPermission,
    [EntityType.CLIENT_ROLE]: ClientRole,
    [EntityType.CLIENT_SCOPE]: ClientScope,
    [EntityType.CONSENT]: Consent,
    [EntityType.EVENT]: Event,
    [EntityType.IDENTITY_PROVIDER]: IdentityProvider,
    [EntityType.IDENTITY_PROVIDER_ACCOUNT]: IdentityProviderAccount,
    [EntityType.IDENTITY_PROVIDER_ATTRIBUTE]: IdentityProviderAttribute,
    [EntityType.IDENTITY_PROVIDER_ROLE_MAPPING]: IdentityProviderRoleMapping,
    [EntityType.KEY]: Key,
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
