/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '../../constants.ts';
import type { IPolicyEngine, PolicyData } from '../../policy';
import type { IPermissionRepository } from '../repository';

export interface IPermissionChecker {
    check(ctx: PermissionCheckerCheckContext): Promise<void>;

    checkOneOf(ctx: PermissionCheckerCheckContext): Promise<void>;

    preCheck(ctx: PermissionCheckerCheckContext): Promise<void>;

    preCheckOneOf(ctx: PermissionCheckerCheckContext): Promise<void>
}

export type PermissionCheckerOptions = {
    repository?: IPermissionRepository,
    policyEngine?: IPolicyEngine,
    realm_id?: string | null,
    client_id?: string | null
};

export type PermissionCheckerCheckOptions = {
    decision_strategy?: `${DecisionStrategy}`,
    policiesIncluded?: string[],
    policiesExcluded?: string[],
};

export type PermissionCheckerCheckContext = {
    name: string | string[],
    input?: PolicyData,
    options?: PermissionCheckerCheckOptions
};
