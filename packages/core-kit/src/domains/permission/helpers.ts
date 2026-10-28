/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NameValidOptions } from '../../helpers';
import { AuthupError } from '@authup/errors';

export function isPermissionNameValid(name: string, options: NameValidOptions = {}) : boolean {
    if (/\s/.test(name)) {
        if (options.throwOnFailure) {
            throw new AuthupError('Whitespace character is not allowed.');
        }

        return false;
    }

    if (/^[a-z0-9-_.:]+$/.test(name)) {
        return true;
    }

    if (options.throwOnFailure) {
        throw new AuthupError('Only the characters [a-z0-9-_.:]+ are allowed.');
    }

    return false;
}
