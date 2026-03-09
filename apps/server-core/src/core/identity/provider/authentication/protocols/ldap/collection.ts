/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { IdentityProviderProtocol, UserError, isLdapIdentityProvider } from '@authup/core-kit';
import type { IIdentityProviderRepository } from '../../../../../entities/index.ts';
import type { IIdentityProviderAccountManager } from '../../../account/index.ts';
import { IdentityProviderLdapAuthenticator } from './module.ts';
import type { ILdapClientFactory } from '../../../../../ldap/index.ts';
import { BaseCredentialsAuthenticator } from '../../../../../authentication/index.ts';
import type { IdentityProviderLdapCollectionAuthenticatorContext } from './types.ts';

export class IdentityProviderLdapCollectionAuthenticator extends BaseCredentialsAuthenticator<User> {
    protected repository: IIdentityProviderRepository;

    protected accountManager: IIdentityProviderAccountManager;

    protected clientFactory: ILdapClientFactory;

    constructor(ctx: IdentityProviderLdapCollectionAuthenticatorContext) {
        super();

        this.repository = ctx.repository;
        this.accountManager = ctx.accountManager;
        this.clientFactory = ctx.clientFactory;
    }

    async authenticate(name: string, password: string, realmId?: string): Promise<User> {
        let error : Error | undefined;
        const entities = await this.repository.findByProtocol(IdentityProviderProtocol.LDAP, realmId);

        for (let i = 0; i < entities.length; i++) {
            const provider = entities[i];

            if (!isLdapIdentityProvider(provider)) {
                continue;
            }

            const authenticator = new IdentityProviderLdapAuthenticator({
                provider,
                accountManager: this.accountManager,
                clientFactory: this.clientFactory,
            });

            const response = await authenticator.safeAuthenticate(name, password);
            if (response.success === true) {
                return response.data;
            }

            error = response.error;
        }

        if (error) {
            throw error;
        }

        throw UserError.credentialsInvalid();
    }
}
