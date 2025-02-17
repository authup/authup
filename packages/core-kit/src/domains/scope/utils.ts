/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NameValidOptions } from '../../helpers';
import { isNameValid } from '../../helpers';
import { ScopeName } from './constants';

export function transformOAuth2ScopeToArray(scope?: string | string[]) : string[] {
    if (!scope) {
        return [];
    }

    if (Array.isArray(scope)) {
        return scope;
    }

    return scope.split(/\s+|,+/);
}

export function hasOAuth2OpenIDScope(scope?: string | string[]) : boolean {
    return transformOAuth2ScopeToArray(scope).indexOf(ScopeName.OPEN_ID) !== -1;
}

export function isOAuth2ScopeAllowed(
    available?: string | string[],
    required?: string[] | string,
) : boolean {
    available = transformOAuth2ScopeToArray(available);

    if (available.indexOf(ScopeName.GLOBAL) !== -1) {
        return true;
    }

    if (available.length === 0) {
        return false;
    }

    required = transformOAuth2ScopeToArray(required);
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
