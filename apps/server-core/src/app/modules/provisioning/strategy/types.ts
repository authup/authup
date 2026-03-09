/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { ProvisioningEntityStrategyType } from './constants.ts';

export type ProvisioningEntityMergeStrategy<A extends ObjectLiteral = ObjectLiteral> = {
    type: `${ProvisioningEntityStrategyType.MERGE}`,
    attributes?: (keyof A)[]
};
export type ProvisioningEntityReplaceStrategy = {
    type: `${ProvisioningEntityStrategyType.REPLACE}`,
};
export type ProvisioningEntityCreateOnlyStrategy = {
    type: `${ProvisioningEntityStrategyType.CREATE_ONLY}`
};

export type ProvisioningEntityStrategy<
    A extends ObjectLiteral = ObjectLiteral,
> = ProvisioningEntityMergeStrategy<A> |
ProvisioningEntityReplaceStrategy |
ProvisioningEntityCreateOnlyStrategy;
