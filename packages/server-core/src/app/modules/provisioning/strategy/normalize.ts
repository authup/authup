/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ProvisioningEntityStrategyType } from './constants.ts';
import type { ProvisioningEntityStrategy } from './types.ts';

export function normalizeEntityProvisioningStrategy(
    input?: ProvisioningEntityStrategy,
) : ProvisioningEntityStrategy {
    if (!input) {
        return {
            type: ProvisioningEntityStrategyType.CREATE_ONLY,
        };
    }

    return input;
}
