/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { ClientError, IdentityType, UserError } from '@authup/core-kit';
import type { IIdentityResolver } from '../../../identity/index.ts';
import { ClientCredentialsService } from '../../credential/index.ts';
import { BaseCredentialsAuthenticator } from '../../base.ts';

export class ClientAuthenticator extends BaseCredentialsAuthenticator<Client> {
    protected identityResolver : IIdentityResolver;

    protected credentialsService : ClientCredentialsService;

    constructor(identityResolver: IIdentityResolver) {
        super();

        this.identityResolver = identityResolver;
        this.credentialsService = new ClientCredentialsService();
    }

    async authenticate(key: string, secret: string, realmId?: string): Promise<Client> {
        const identity = await this.identityResolver.resolve(IdentityType.CLIENT, key, realmId);
        if (!identity || identity.type !== IdentityType.CLIENT) {
            throw UserError.credentialsInvalid();
        }

        if (identity.data.is_confidential) {
            const verified = await this.credentialsService.verify(secret, identity.data);
            if (!verified) {
                throw ClientError.credentialsInvalid();
            }
        } else {
            throw ClientError.invalid();
        }

        if (!identity.data.active) {
            throw ClientError.inactive();
        }

        return identity.data;
    }
}
