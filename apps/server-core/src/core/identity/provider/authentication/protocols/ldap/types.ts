/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LdapIdentityProvider } from '@authup/core-kit';
import type { IIdentityProviderRepository } from '../../../../../entities/index.ts';
import type { ILdapClientFactory } from '../../../../../ldap/index.ts';
import type { IIdentityProviderAccountManager } from '../../../account/index.ts';

type IdentityProviderAuthenticatorBaseContext = {
    clientFactory: ILdapClientFactory,
    accountManager: IIdentityProviderAccountManager
};

export type IdentityProviderLdapCollectionAuthenticatorContext = IdentityProviderAuthenticatorBaseContext & {
    repository: IIdentityProviderRepository
};

export type IdentityProviderLdapAuthenticatorContext = IdentityProviderAuthenticatorBaseContext & {
    provider: LdapIdentityProvider
};
