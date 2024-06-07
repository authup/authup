/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyType } from '../../constants';
import type { PolicyBase } from '../../types';
import type { TimePolicy } from './types';

export function isTimePolicy(input: PolicyBase) : input is TimePolicy {
    return input.type === PolicyType.TIME;
}
