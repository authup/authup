/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { IdentityType, UserError } from '@authup/core-kit';
import type { IIdentityResolver } from '../../../identity';
import { UserCredentialsService } from '../../credential';
import { BaseCredentialsAuthenticator } from '../../base';

export class UserAuthenticator extends BaseCredentialsAuthenticator<User> {
    protected identityResolver : IIdentityResolver;

    protected credentialsService : UserCredentialsService;

    constructor(identityResolver: IIdentityResolver) {
        super();

        this.identityResolver = identityResolver;
        this.credentialsService = new UserCredentialsService();
    }

    async authenticate(key: string, secret: string, realmId?: string): Promise<User> {
        const identity = await this.identityResolver.resolve(IdentityType.USER, key, realmId);
        if (!identity || identity.type !== IdentityType.USER) {
            throw UserError.credentialsInvalid();
        }

        const verified = await this.credentialsService.verify(secret, identity.data);
        if (!verified) {
            throw UserError.credentialsInvalid();
        }

        if (!identity.data.active) {
            throw UserError.inactive();
        }

        return identity.data;
    }
}
