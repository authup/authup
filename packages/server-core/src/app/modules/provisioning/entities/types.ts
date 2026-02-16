/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { ProvisioningEntityStrategy } from '../strategy/index.ts';

export type BaseProvisioningEntity<A extends ObjectLiteral = ObjectLiteral> = {
    strategy?: ProvisioningEntityStrategy<A>
};
