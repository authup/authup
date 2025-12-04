/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { ClientError } from '@authup/core-kit';
import { ClientCredentialsService } from '../../credential';
import { BaseAuthenticator } from '../../base';

export class ClientAuthenticator extends BaseAuthenticator<Client> {
    protected credentialsService : ClientCredentialsService;

    constructor() {
        super();

        this.credentialsService = new ClientCredentialsService();
    }

    async authenticate(entity: Client, secret: string): Promise<Client> {
        if (entity.is_confidential) {
            const verified = await this.credentialsService.verify(secret, entity);
            if (!verified) {
                throw ClientError.credentialsInvalid();
            }
        } else {
            throw ClientError.invalid();
        }

        if (!entity.active) {
            throw ClientError.inactive();
        }

        return entity;
    }
}
