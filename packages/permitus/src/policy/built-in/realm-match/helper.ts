/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnyPolicy } from '../../types';
import { BuiltInPolicyType } from '../constants';
import type { RealmMatchPolicy } from './types';

export function isRealmMatchPolicy(input: AnyPolicy) : input is RealmMatchPolicy {
    return input.type === BuiltInPolicyType.REALM_MATCH;
}
