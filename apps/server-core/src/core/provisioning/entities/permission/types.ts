/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Permission } from '@authup/core-kit';
import type { BaseProvisioningEntity } from '../types.ts';

export type PermissionProvisioningRelations = {
    /**
     * Policy names to attach to this permission via auth_permission_policies.
     * Resolved to IDs and inserted as junction rows during provisioning.
     */
    policies?: string[],
};

export type PermissionProvisioningEntity = BaseProvisioningEntity<Permission> & {
    attributes: Partial<Permission>,
    relations?: PermissionProvisioningRelations,
};
