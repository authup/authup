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

    /**
     * Upstream assurance allow-lists. Comma- or space-separated.
     *
     * `requiredAmr` passes on any intersection with the id_token's `amr`,
     * `requiredAcr` on membership of its `acr`. Both null (the default)
     * trusts the provider unconditionally, which is what authup did before
     * these existed. Set either and a login whose id_token does not satisfy
     * it is refused - including one that carries no id_token at all.
     */
    requiredAmr?: string | null;

    requiredAcr?: string | null;
}

export interface OAuth2IdentityProvider extends IdentityProvider, OAuth2IdentityProviderBase {
    protocol: `${IdentityProviderProtocol.OAUTH2}`;
}
