/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnyPolicy } from '../../types';
import { BuiltInPolicyType } from '../constants';
import type { DatePolicy } from './types';

export function isDatePolicy(input: AnyPolicy) : input is DatePolicy {
    return input.type === BuiltInPolicyType.DATE;
}
