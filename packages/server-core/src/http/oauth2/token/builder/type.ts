/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2SubKind } from '@authup/specs';

export type OAuth2AccessTokenBuildContext = {
    issuer: string,

    sub: string,
    subKind: `${OAuth2SubKind}`,

    realmId: string,

    realmName: string,

    scope?: string,
    clientId?: string,

    remoteAddress: string,

    maxAge?: number
};

export type OAuth2OpenIdTokenBuildContext = OAuth2AccessTokenBuildContext;

export type OAuth2RefreshTokenBuildContext = OAuth2AccessTokenBuildContext;
