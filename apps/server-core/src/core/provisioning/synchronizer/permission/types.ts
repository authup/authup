/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionPolicyRepository } from '../../../entities/permission-policy/types.ts';
import type { IPermissionRepository, IPolicyRepository } from '../../../entities/index.ts';
import type { IProvisioningRealmRepairer } from '../../types.ts';

export type PermissionProvisioningSynchronizerContext = {
    repository: IPermissionRepository,
    policyRepository?: IPolicyRepository,
    permissionPolicyRepository?: IPermissionPolicyRepository,

    /**
     * Gives the rows referring to a client-owned row stored without a realm
     * the realm of its client; without it only the row itself is repaired.
     */
    realmRepairer?: IProvisioningRealmRepairer,
};
