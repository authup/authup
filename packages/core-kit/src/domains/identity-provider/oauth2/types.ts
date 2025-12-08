/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '../entity';
import type { IdentityProviderProtocol } from '../constants';

export interface OAuth2IdentityProviderBase {
    client_id: string;

    client_secret: string;

    token_url: string;

    token_revoke_url?: string | null;

    authorize_url: string;

    user_info_url?: string | null;

    scope?: string;
}

export interface OAuth2IdentityProvider extends IdentityProvider, OAuth2IdentityProviderBase {
    protocol: `${IdentityProviderProtocol.OAUTH2}`;
}
