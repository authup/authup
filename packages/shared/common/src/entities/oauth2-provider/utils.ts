/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function buildOAuth2ProviderAuthorizeCallbackPath(id: string | number) {
    return `/oauth2-providers/${id}/authorize-callback`;
}

export function buildOAuth2ProviderAuthorizePath(id: string | number) {
    return `/oauth2-providers/${id}/authorize-url`;
}
