/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2Scope } from '../constants';

export function transformOAuth2ScopeToArray(scope?: string | string[]) : string[] {
    if (typeof scope === 'undefined') {
        return [];
    }

    if (Array.isArray(scope)) {
        return scope;
    }

    return scope.split(' ');
}

export function hasOAuth2OpenIDScope(scope?: string | string[]) : boolean {
    return transformOAuth2ScopeToArray(scope).indexOf(OAuth2Scope.OPEN_ID) !== -1;
}

export function isOAuth2ScopeAllowed(
    available?: string | string[],
    required?: string[] | string,
) : boolean {
    available = transformOAuth2ScopeToArray(available);

    if (available.indexOf(OAuth2Scope.GLOBAL) !== -1) {
        return true;
    }

    required = transformOAuth2ScopeToArray(required);
    for (let i = 0; i < required.length; i++) {
        if (available.indexOf(required[i]) === -1) {
            return false;
        }
    }

    return true;
}
