/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import { OAuth2ScopeError, hasOAuth2Scopes } from '@authup/specs';

/**
 * Resolve the scope a request is granted against the scopes bound to the
 * client: a requested scope must be covered by the bound set (or carry
 * `global`), and excess is rejected rather than clipped; an absent request
 * grants every bound scope.
 */
export function resolveGrantedScope(scopeNames: string[], requested?: string | null) : string {
    if (requested) {
        if (
            !hasOAuth2Scopes(scopeNames, requested) &&
            !hasOAuth2Scopes(requested, ScopeName.GLOBAL)
        ) {
            throw OAuth2ScopeError.insufficient();
        }

        return requested;
    }

    return scopeNames.join(' ');
}
