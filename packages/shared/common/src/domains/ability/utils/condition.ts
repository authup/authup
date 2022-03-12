/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Condition } from '../type';

export function buildPermissionMetaCondition(input: string | null) : Condition {
    if (typeof input === 'undefined') {
        return {};
    }

    // todo: verify object shape

    return JSON.parse(input);
}
