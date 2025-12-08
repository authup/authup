/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderProtocol } from '../constants';
import type { IdentityProvider } from '../entity';
import type { OAuth2IdentityProvider } from './types';

export function isOAuth2IdentityProvider(input: IdentityProvider) : input is OAuth2IdentityProvider {
    return input.protocol === IdentityProviderProtocol.OAUTH2;
}
