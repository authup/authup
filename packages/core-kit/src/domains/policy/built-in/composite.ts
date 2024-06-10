/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompositePolicy as BaseGroupPolicy, BuiltInPolicyType } from '@authup/kit';
import type { Policy } from '../entity';

export interface CompositePolicy extends Policy, Omit<BaseGroupPolicy, 'invert'> {
    type: `${BuiltInPolicyType.COMPOSITE}`
}
