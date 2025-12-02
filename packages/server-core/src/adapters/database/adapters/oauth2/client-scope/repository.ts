/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientScope } from '@authup/core-kit';
import { useDataSource } from 'typeorm-extension';
import type { IOAuth2ClientScopeRepository } from '../../../../../core';
import { ClientScopeEntity } from '../../../domains';

export class OAuth2ClientScopeRepository implements IOAuth2ClientScopeRepository {
    async findByClientId(clientId: string): Promise<ClientScope[]> {
        const dataSource = await useDataSource();
        const clientScopeRepository = dataSource.getRepository(ClientScopeEntity);
        return clientScopeRepository.find({
            where: {
                client_id: clientId,
            },
            relations: {
                scope: true,
            },
        });
    }
}
