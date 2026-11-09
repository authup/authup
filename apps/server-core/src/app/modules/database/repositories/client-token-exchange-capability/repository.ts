/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IClientTokenExchangeCapabilityRepository } from '../../../../../core/entities/client-token-exchange-capability/types.ts';
import { ClientTokenExchangeCapabilityEntity } from '../../../../../adapters/database/domains/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export type ClientTokenExchangeCapabilityRepositoryAdapterOptions = {
    lockRows?: boolean,
};

export class ClientTokenExchangeCapabilityRepositoryAdapter extends EntityRepositoryAdapter<ClientTokenExchangeCapability>
    implements IClientTokenExchangeCapabilityRepository {
    constructor(
        repository: Repository<ClientTokenExchangeCapability>,
        options: ClientTokenExchangeCapabilityRepositoryAdapterOptions = {},
    ) {
        super(repository, {
            alias: 'tokenExchangeCapability',
            target: ClientTokenExchangeCapabilityEntity,
            entity: 'client token exchange capability',
            realmScope: { column: 'realmId' },
            lockRows: options.lockRows,
        });
    }

    async transaction<R>(fn: (repository: IClientTokenExchangeCapabilityRepository) => Promise<R>): Promise<R> {
        const dataSource = this.repository.manager.connection;

        if (!isDatabaseTypeRowLockable(dataSource.options.type)) {
            return fn(this);
        }

        return dataSource.transaction((manager) => fn(new ClientTokenExchangeCapabilityRepositoryAdapter(
            manager.getRepository(ClientTokenExchangeCapabilityEntity),
            { lockRows: true },
        )));
    }
}
