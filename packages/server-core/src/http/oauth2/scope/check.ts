/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function hasOAuth2Scope(scopes: string[] | string | undefined, scope: string) {
    if (Array.isArray(scope)) {
        return scope.includes(scope);
    }

    return scopes === scope;
}
