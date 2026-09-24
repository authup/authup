/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientScope } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IClientScopeRepository } from '../../../../../core/entities/client-scope/types.ts';
import { ClientScopeEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class ClientScopeRepositoryAdapter extends EntityRepositoryAdapter<ClientScope> implements IClientScopeRepository {
    constructor(repository: Repository<ClientScope>) {
        super(repository, {
            alias: 'clientScope',
            target: ClientScopeEntity,
            entity: 'client scope',
            realmScope: { column: 'clientRealmId' },
        });
    }
}
