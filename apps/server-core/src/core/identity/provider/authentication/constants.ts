/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type { IdentityProviderLdapCollectionAuthenticator } from './protocols/ldap/index.ts';

export const IDENTITY_PROVIDER_LDAP_COLLECTION_AUTHENTICATOR_TOKEN = new TypedToken<IdentityProviderLdapCollectionAuthenticator>('IdentityProviderLdapCollectionAuthenticator');
