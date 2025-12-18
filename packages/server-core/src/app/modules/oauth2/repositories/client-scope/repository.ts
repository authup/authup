/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientScope } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IOAuth2ClientScopeRepository } from '../../../../../core';

export class OAuth2ClientScopeRepository implements IOAuth2ClientScopeRepository {
    private readonly repository: Repository<ClientScope>;

    constructor(
        repository: Repository<ClientScope>,
    ) {
        this.repository = repository;
    }

    async findByClientId(clientId: string): Promise<ClientScope[]> {
        return this.repository.find({
            where: {
                client_id: clientId,
            },
            relations: {
                scope: true,
            },
        });
    }
}
