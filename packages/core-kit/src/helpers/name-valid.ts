/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';

export type NameValidOptions = {
    throwOnFailure?: boolean;
};
export function isNameValid(input: string, options: NameValidOptions = {}): boolean {
    if (/\s/g.test(input)) {
        if (options.throwOnFailure) {
            throw new AuthupError('Whitespace character is not allowed.');
        }

        return false;
    }

    if (/^[A-Za-z0-9-_.]+$/.test(input)) {
        return true;
    }

    if (options.throwOnFailure) {
        throw new AuthupError('Only the characters [A-Za-z0-9-_.]+ are allowed.');
    }

    return false;
}
