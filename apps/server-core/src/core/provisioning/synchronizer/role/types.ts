/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IClientRepository,
    IPermissionRepository,
    IPolicyRepository,
    IRolePermissionRepository,
    IRoleRepository,
} from '../../../entities/index.ts';
import type { IProvisioningRealmRepairer } from '../../types.ts';

export type RoleProvisioningSynchronizerContext = {
    repository: IRoleRepository,
    permissionRepository: IPermissionRepository,

    /**
     * Resolves the global policy a `relations.globalPermissionsPolicy` names.
     */
    policyRepository: IPolicyRepository,
    rolePermissionRepository: IRolePermissionRepository,

    /**
     * Resolves the clients a `relations.clientPermissions` entry names.
     */
    clientRepository: IClientRepository,

    /**
     * Gives the rows referring to a client-owned row stored without a realm
     * the realm of its client; without it only the row itself is repaired.
     */
    realmRepairer?: IProvisioningRealmRepairer,
};
