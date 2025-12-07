/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider } from './oauth2';
import type { LdapIdentityProvider } from './ldap';
import type { OpenIDIdentityProvider } from './oidc';

export type IdentityProviderProtocolType = OAuth2IdentityProvider |
LdapIdentityProvider |
OpenIDIdentityProvider;
