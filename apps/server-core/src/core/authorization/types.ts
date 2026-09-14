/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePermission, BasePolicy } from '@authup/access';
import type { Logger } from '@authup/server-kit';

export type PermissionDefinition = {
    permission: BasePermission,
    policies: BasePolicy[],
};

export interface IPermissionDefinitionProvider {
    /**
     * Every permission definition with its junction policy trees.
     */
    findAll(): Promise<PermissionDefinition[]>;

    /**
     * Every policy tree a grant can name: the distinct policies the role, user
     * and client permission junction rows reference.
     */
    findGrantPolicies(): Promise<BasePolicy[]>;
}

export type AuthorizationCatalogBuilderContext = {
    permissionDefinitionProvider: IPermissionDefinitionProvider,
    logger?: Logger,
};
