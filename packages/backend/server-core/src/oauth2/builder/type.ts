/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AccessToken, OAuth2SubKind,
} from '@authelion/common';

export type OAuth2AbstractBuilderContext = {
    maxAge?: number,
};

export type OAuth2AccessTokenBuilderContext = OAuth2AbstractBuilderContext & {
    selfUrl: string,
};

export type OAuth2AccessTokenBuilderCreateContext = {
    sub: string,
    subKind: `${OAuth2SubKind}`,

    realmId: string,

    scope?: string,
    clientId?: string,

    remoteAddress: string,
};

// ------------------------------------------------------------------

export type OAuth2AuthorizationCodeBuilderContext = OAuth2AccessTokenBuilderContext;

export type OAuth2AuthorizationCodeBuilderCreateContext = {
    sub: string,
    subEntity: Record<string, any>,
    subKind: `${OAuth2SubKind}`,

    realmId: string,

    scope?: string,
    clientId: string,
    redirectUri: string,

    remoteAddress: string,
};

// ------------------------------------------------------------------

export type OAuth2RefreshTokenBuilderContext = OAuth2AbstractBuilderContext;

export type OAuth2RefreshTokenBuilderCreateContext = {
    accessToken: OAuth2AccessToken
};
