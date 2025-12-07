/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProviderBase } from './oauth2';
import type { IdentityProviderProtocol } from '../constants';
import type { IdentityProvider } from '../entity';

export interface OpenIDIdentityProvider extends IdentityProvider, OAuth2IdentityProviderBase {
    protocol: `${IdentityProviderProtocol.OIDC}`;
}
