/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import { ProvisioningEntityStrategyType } from './constants.ts';
import type { ProvisioningEntityStrategy } from './types.ts';

export function normalizeEntityProvisioningStrategy<A extends ObjectLiteral = ObjectLiteral>(
    input?: ProvisioningEntityStrategy<A>,
) : ProvisioningEntityStrategy<A> {
    if (!input) {
        return {
            type: ProvisioningEntityStrategyType.CREATE_ONLY,
        };
    }

    return input;
}
