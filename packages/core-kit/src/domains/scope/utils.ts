/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NameValidOptions } from '../../helpers';
import { isNameValid } from '../../helpers';
import { ScopeName } from './constants';

export function serializeOAuth2Scope(scope: string[]) {
    return scope.join(' ');
}

/**
 * Deserialize a string representation of multiple oauth2 scopes.
 *
 * @param scope
 */
export function deserializeOAuth2Scope(scope: string) : string[] {
    return scope.split(/\s+|,+/);
}

export function hasOAuth2Scope(scopes: string[], name: string) : boolean {
    return scopes.indexOf(name) !== -1;
}

export function isOAuth2ScopeAllowed(
    available: string[],
    required: string[],
) : boolean {
    if (available.indexOf(ScopeName.GLOBAL) !== -1) {
        return true;
    }

    if (available.length === 0) {
        return false;
    }

    for (let i = 0; i < required.length; i++) {
        if (available.indexOf(required[i]) === -1) {
            return false;
        }
    }

    return true;
}

export function isScopeNameValid(name: string, options: NameValidOptions = {}) : boolean {
    return isNameValid(name, options);
}
