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
import type { EntityType } from './contstants';
import type { IdentityProvider } from './identity-provider';
import type { IdentityProviderAccount } from './identity-provider-account';
import type { IdentityProviderAttribute } from './identity-provider-attribute';
import type { IdentityProviderRoleMapping } from './identity-provider-role-mapping';
import type { Permission } from './permission';
import type { Policy } from './policy';
import type { PolicyAttribute } from './policy-attribute';
import type { Realm } from './realm';
import type { Robot } from './robot';
import type { RobotPermission } from './robot-permission';
import type { RobotRole } from './robot-role';
import type { Role } from './role';
import type { RoleAttribute } from './role-attribute';
import type { RolePermission } from './role-permission';
import type { Scope } from './scope';
import type { User } from './user';
import type { UserAttribute } from './user-attribute';
import type { UserPermission } from './user-permission';
import type { UserRole } from './user-role';

type EntityTypeMapRaw = {
    [EntityType.CLIENT]: Client,
    [EntityType.CLIENT_PERMISSION]: ClientPermission,
    [EntityType.CLIENT_ROLE]: ClientRole,
    [EntityType.CLIENT_SCOPE]: ClientScope,
    [EntityType.IDENTITY_PROVIDER]: IdentityProvider,
    [EntityType.IDENTITY_PROVIDER_ACCOUNT]: IdentityProviderAccount,
    [EntityType.IDENTITY_PROVIDER_ATTRIBUTE]: IdentityProviderAttribute,
    [EntityType.IDENTITY_PROVIDER_ROLE_MAPPING]: IdentityProviderRoleMapping,
    [EntityType.POLICY]: Policy,
    [EntityType.POLICY_ATTRIBUTE]: PolicyAttribute,
    [EntityType.PERMISSION]: Permission,
    [EntityType.REALM]: Realm,
    [EntityType.ROBOT]: Robot,
    [EntityType.ROBOT_PERMISSION]: RobotPermission,
    [EntityType.ROBOT_ROLE]: RobotRole,
    [EntityType.ROLE]: Role,
    [EntityType.ROLE_ATTRIBUTE]: RoleAttribute,
    [EntityType.ROLE_PERMISSION]: RolePermission,
    [EntityType.SCOPE]: Scope,
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
