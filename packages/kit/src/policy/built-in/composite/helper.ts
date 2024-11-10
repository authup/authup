/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyWithType } from '../../types';
import { BuiltInPolicyType } from '../constants';
import type { CompositePolicy } from './types';

export function isCompositePolicy(
    input: PolicyWithType,
) : input is PolicyWithType<CompositePolicy> {
    return input.type === BuiltInPolicyType.COMPOSITE;
}
