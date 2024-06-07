/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyType } from '../../constants';
import type { PolicyBase } from '../../types';
import type { GroupPolicy } from './types';

export function isGroupPolicy(input: PolicyBase) : input is GroupPolicy {
    return input.type === PolicyType.GROUP;
}
