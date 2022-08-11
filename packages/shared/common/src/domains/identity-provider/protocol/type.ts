/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2IdentityProvider } from './oauth2';
import { LdapIdentityProvider } from './ldap';
import { OpenIDConnectIdentityProvider } from './oidc';

export type IdentityProviderProtocolType = OAuth2IdentityProvider |
LdapIdentityProvider |
OpenIDConnectIdentityProvider;
