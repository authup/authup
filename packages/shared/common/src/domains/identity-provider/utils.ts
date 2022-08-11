/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function buildIdentityProviderAuthorizeCallbackPath(id: string | number) {
    return `/identity-providers/${id}/authorize-callback`;
}

export function buildIdentityProviderAuthorizePath(id: string | number) {
    return `/identity-providers/${id}/authorize-url`;
}
