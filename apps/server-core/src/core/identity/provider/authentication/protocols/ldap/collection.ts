/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { IdentityProviderProtocol, isLdapIdentityProvider } from '@authup/core-kit';
import { EntityCredentialsInvalidError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import { describeError } from '../../../../../../utils/index.ts';
import type { IIdentityProviderRepository } from '../../../../../entities/index.ts';
import { isIdentityProviderEnrollmentDeniedError } from '../../../account/enrollment-error.ts';
import type { IIdentityProviderAccountManager } from '../../../account/index.ts';
import { IdentityProviderLdapAuthenticator } from './module.ts';
import type { ILdapClientFactory } from '../../../../../ldap/index.ts';
import { BaseCredentialsAuthenticator } from '../../../../../authentication/index.ts';
import type { IdentityProviderLdapCollectionAuthenticatorContext } from './types.ts';

export class IdentityProviderLdapCollectionAuthenticator extends BaseCredentialsAuthenticator<User> {
    protected repository: IIdentityProviderRepository;

    protected accountManager: IIdentityProviderAccountManager;

    protected clientFactory: ILdapClientFactory;

    protected logger?: Logger;

    constructor(ctx: IdentityProviderLdapCollectionAuthenticatorContext) {
        super();

        this.repository = ctx.repository;
        this.accountManager = ctx.accountManager;
        this.clientFactory = ctx.clientFactory;
        this.logger = ctx.logger;
    }

    async authenticate(name: string, password: string, realmId?: string): Promise<User> {
        let error : Error | undefined;
        const entities = await this.repository.findByProtocol(IdentityProviderProtocol.LDAP, realmId);

        for (const provider of entities) {
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

            // The composite authenticator in front of this one answers with
            // its LAST strategy's error, so a refused enrollment reaches the
            // caller as a plain credentials failure: right for an anonymous
            // token endpoint, and the reason is logged here or nowhere.
            if (isIdentityProviderEnrollmentDeniedError(response.error)) {
                this.logger?.warn(describeError(
                    response.error,
                    `The identity provider (${provider.id}) login was refused.`,
                ));
            }

            error = response.error;
        }

        if (error) {
            throw error;
        }

        throw new EntityCredentialsInvalidError({ entity: 'user' });
    }
}
