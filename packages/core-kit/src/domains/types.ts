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
import type { ResourceType } from './contstants';
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

type ResourceTypeMapRaw = {
    [ResourceType.CLIENT]: Client,
    [ResourceType.CLIENT_PERMISSION]: ClientPermission,
    [ResourceType.CLIENT_ROLE]: ClientRole,
    [ResourceType.CLIENT_SCOPE]: ClientScope,
    [ResourceType.IDENTITY_PROVIDER]: IdentityProvider,
    [ResourceType.IDENTITY_PROVIDER_ACCOUNT]: IdentityProviderAccount,
    [ResourceType.IDENTITY_PROVIDER_ATTRIBUTE]: IdentityProviderAttribute,
    [ResourceType.IDENTITY_PROVIDER_ROLE_MAPPING]: IdentityProviderRoleMapping,
    [ResourceType.POLICY]: Policy,
    [ResourceType.POLICY_ATTRIBUTE]: PolicyAttribute,
    [ResourceType.PERMISSION]: Permission,
    [ResourceType.REALM]: Realm,
    [ResourceType.ROBOT]: Robot,
    [ResourceType.ROBOT_PERMISSION]: RobotPermission,
    [ResourceType.ROBOT_ROLE]: RobotRole,
    [ResourceType.ROLE]: Role,
    [ResourceType.ROLE_ATTRIBUTE]: RoleAttribute,
    [ResourceType.ROLE_PERMISSION]: RolePermission,
    [ResourceType.SCOPE]: Scope,
    [ResourceType.USER]: User,
    [ResourceType.USER_ATTRIBUTE]: UserAttribute,
    [ResourceType.USER_PERMISSION]: UserPermission,
    [ResourceType.USER_ROLE]: UserRole,
};

export type ResourceTypeMap = {
    [K in keyof ResourceTypeMapRaw as `${K}`]: ResourceTypeMapRaw[K]
};

export type EventRecord<
    T extends string,
    D extends Record<string, any>,
> = {
    type: T,
    data: D,
    event: string,
};

export type SingleResourceResponse<R> = R;
export type CollectionResourceResponse<R> = {
    data: R[],
    meta: {
        limit: number,
        offset: number,
        total: number
    }
};
