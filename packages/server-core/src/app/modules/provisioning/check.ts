/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import { isObject } from '@authup/kit';
import type { ProvisioningContainer } from './types.ts';

export function isProvisioningContainer<
DATA extends ObjectLiteral = ObjectLiteral,
META extends ObjectLiteral = ObjectLiteral,
>(input: unknown) : input is ProvisioningContainer<DATA, META> {
    return isObject(input) &&
        isObject(input.data) &&
        isObject(input.relations);
}
