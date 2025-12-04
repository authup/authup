/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { UserError } from '@authup/core-kit';
import { UserCredentialsService } from '../../credential';
import { BaseAuthenticator } from '../../base';

export class UserAuthenticator extends BaseAuthenticator<User> {
    protected credentialsService : UserCredentialsService;

    constructor() {
        super();

        this.credentialsService = new UserCredentialsService();
    }

    async authenticate(entity: User, secret: string): Promise<User> {
        const verified = await this.credentialsService.verify(secret, entity);
        if (!verified) {
            throw UserError.credentialsInvalid();
        }

        if (!entity.active) {
            throw UserError.inactive();
        }

        return entity;
    }
}
