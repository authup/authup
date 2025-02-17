/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isNameValid } from '../../helpers';

export function buildIdentityProviderAuthorizeCallbackPath(id: string | number) {
    return `/identity-providers/${id}/authorize-callback`;
}

export function buildIdentityProviderAuthorizePath(id: string | number) {
    return `/identity-providers/${id}/authorize-url`;
}

export function isIdentityProviderNameValid(input: string) : boolean {
    return isNameValid(input);
}
