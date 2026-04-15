/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NameValidOptions } from '../../helpers';
import { isNameValid } from '../../helpers';
import type { Policy } from './entity';

export function isPolicyNameValid(name: string, options: NameValidOptions = {}) : boolean {
    return isNameValid(name, options);
}

export function isPolicy(input: Record<string, any>): input is Policy {
    return typeof input === 'object' &&
        input !== null &&
        typeof input.id === 'string' &&
        typeof input.type === 'string';
}
