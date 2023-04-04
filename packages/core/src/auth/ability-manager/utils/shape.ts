/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AbilityID } from '../type';
import { hasOwnProperty } from '../../../utils';

export function isAbilityID(input: unknown) : input is AbilityID {
    return typeof input === 'object' &&
        hasOwnProperty(input, 'action') &&
        hasOwnProperty(input, 'subject') &&
        (
            typeof input.subject === 'string' ||
                typeof input.subject === 'object'
        );
}
