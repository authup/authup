/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2SubKind, transformOAuth2ScopeToArray } from '@authelion/common';

export function resolveOAuth2SubAttributesForScope(
    subKind: OAuth2SubKind,
    scope: string,
) : string[] {
    const scopes = transformOAuth2ScopeToArray(scope);

    return [];
}
