/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnyPolicy } from '../../types';
import { BuiltInPolicyType } from '../constants';
import type { TimePolicy } from './types';

export function isTimePolicy(input: AnyPolicy) : input is TimePolicy {
    return input.type === BuiltInPolicyType.TIME;
}
