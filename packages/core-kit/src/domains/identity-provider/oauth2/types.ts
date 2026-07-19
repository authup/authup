/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '../entity';
import type { IdentityProviderProtocol } from '../constants';

export interface OAuth2IdentityProviderBase {
    clientId: string;

    clientSecret: string;

    tokenUrl: string;

    tokenRevokeUrl?: string | null;

    authorizeUrl: string;

    userInfoUrl?: string | null;

    scope?: string | null;
}

export interface OAuth2IdentityProvider extends IdentityProvider, OAuth2IdentityProviderBase {
    protocol: `${IdentityProviderProtocol.OAUTH2}`;
}
