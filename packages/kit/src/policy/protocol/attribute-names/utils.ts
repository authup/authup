/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyType } from '../../constants';
import type { PolicyBase } from '../../types';
import type { AttributeNamesPolicy } from './types';

export function isPolicyAttributeNames(input: PolicyBase) : input is AttributeNamesPolicy {
    return input.type === PolicyType.ATTRIBUTE_NAMES;
}
