/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyType } from '../../constants';
import type { PolicyBase } from '../../types';
import type { AttributesPolicy } from './types';

export function isAttributesPolicy(input: PolicyBase) : input is AttributesPolicy {
    return input.type === PolicyType.ATTRIBUTES;
}
