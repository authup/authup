/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderProtocol } from '../constants';
import type { IdentityProvider } from '../entity';
import type { OpenIDIdentityProvider } from './types';

export function isOpenIDIdentityProvider(input: IdentityProvider) : input is OpenIDIdentityProvider {
    return input.protocol === IdentityProviderProtocol.OIDC;
}
