/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from './client';
import type { ClientScope } from './client-scope';
import type { DomainType } from './contstants';
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

type DomainTypeMapRaw = {
    [DomainType.CLIENT]: Client,
    [DomainType.CLIENT_SCOPE]: ClientScope,
    [DomainType.IDENTITY_PROVIDER]: IdentityProvider,
    [DomainType.IDENTITY_PROVIDER_ACCOUNT]: IdentityProviderAccount,
    [DomainType.IDENTITY_PROVIDER_ATTRIBUTE]: IdentityProviderAttribute,
    [DomainType.IDENTITY_PROVIDER_ROLE_MAPPING]: IdentityProviderRoleMapping,
    [DomainType.POLICY]: Policy,
    [DomainType.POLICY_ATTRIBUTE]: PolicyAttribute,
    [DomainType.PERMISSION]: Permission,
    [DomainType.REALM]: Realm,
    [DomainType.ROBOT]: Robot,
    [DomainType.ROBOT_PERMISSION]: RobotPermission,
    [DomainType.ROBOT_ROLE]: RobotRole,
    [DomainType.ROLE]: Role,
    [DomainType.ROLE_ATTRIBUTE]: RoleAttribute,
    [DomainType.ROLE_PERMISSION]: RolePermission,
    [DomainType.SCOPE]: Scope,
    [DomainType.USER]: User,
    [DomainType.USER_ATTRIBUTE]: UserAttribute,
    [DomainType.USER_PERMISSION]: UserPermission,
    [DomainType.USER_ROLE]: UserRole,
};

export type DomainTypeMap = {
    [K in keyof DomainTypeMapRaw as `${K}`]: DomainTypeMapRaw[K]
};

export type DomainTypeEventMap = {
    [K in keyof DomainTypeMap]: {
        type: `${K}`,
        data: DomainTypeMap[K],
        event: string,
    }
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
