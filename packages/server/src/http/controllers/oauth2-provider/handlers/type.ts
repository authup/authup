/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Oauth2ProviderRouteContext = {
    selfUrl: string,
    selfCallbackPath?: string
};

export type Oauth2ProviderRouteAuthorizeContext = Oauth2ProviderRouteContext;

export type Oauth2ProviderRouteAuthorizeCallbackContext = Oauth2ProviderRouteContext & {
    rsaKeyPairPath: string,
    maxAge?: number,

    webUrl: string
};
