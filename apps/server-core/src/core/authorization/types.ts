/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePermission, BasePolicy } from '@authup/access';
import type { Logger } from '@authup/server-kit';

/**
 * One permission definition: the permission and the policy trees bound to it.
 */
export type PermissionPolicies = [BasePermission, BasePolicy[]];

/**
 * Everything the authorization catalog is built from. Both halves are read
 * whole, once per build: the catalog is identity-free, so there is nothing to
 * scope either of them by.
 */
export interface IAuthorizationCatalogSource {
    /**
     * Every permission definition with the policy trees bound to it.
     */
    findDefinitions(): Promise<PermissionPolicies[]>;

    /**
     * Every policy tree a grant can name: the distinct policies the role, user
     * and client permission junction rows reference. They travel in the same
     * catalog, since a grant reaches the consumer through an introspection
     * that carries policy ids alone.
     */
    findGrantPolicies(): Promise<BasePolicy[]>;
}

export type AuthorizationCatalogBuilderContext = {
    catalogSource: IAuthorizationCatalogSource,
    logger?: Logger,
};
