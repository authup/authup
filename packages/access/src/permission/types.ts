/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '../constants';
import type {
    PolicyData, PolicyEngine, PolicyWithType,
} from '../policy';
import type { PermissionProvider } from './provider';

export type PermissionItem = {
    name: string,
    clientId?: string | null,
    realmId?: string | null,
    policy?: PolicyWithType,
};

export type PermissionCheckerOptions = {
    provider?: PermissionProvider,
    policyEngine?: PolicyEngine,
    realmId?: string | null,
    clientId?: string | null
};

export type PermissionCheckerCheckOptions = {
    decisionStrategy?: `${DecisionStrategy}`,
    policiesIncluded?: string[],
    policiesExcluded?: string[],
};

export type PermissionCheckerCheckContext = {
    name: string | string[],
    data?: PolicyData,
    options?: PermissionCheckerCheckOptions
};
