/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IClientTokenExchangePolicyRepository } from '../../../../../core/entities/client-token-exchange-policy/types.ts';
import { ClientTokenExchangePolicyEntity } from '../../../../../adapters/database/domains/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export type ClientTokenExchangePolicyRepositoryAdapterOptions = {
    lockRows?: boolean,
};

export class ClientTokenExchangePolicyRepositoryAdapter extends EntityRepositoryAdapter<ClientTokenExchangePolicy>
    implements IClientTokenExchangePolicyRepository {
    constructor(
        repository: Repository<ClientTokenExchangePolicy>,
        options: ClientTokenExchangePolicyRepositoryAdapterOptions = {},
    ) {
        super(repository, {
            alias: 'tokenExchangePolicy',
            target: ClientTokenExchangePolicyEntity,
            entity: 'client token exchange policy',
            realmScope: { column: 'realmId' },
            lockRows: options.lockRows,
        });
    }

    async transaction<R>(fn: (repository: IClientTokenExchangePolicyRepository) => Promise<R>): Promise<R> {
        const dataSource = this.repository.manager.connection;

        if (!isDatabaseTypeRowLockable(dataSource.options.type)) {
            return fn(this);
        }

        return dataSource.transaction((manager) => fn(new ClientTokenExchangePolicyRepositoryAdapter(
            manager.getRepository(ClientTokenExchangePolicyEntity),
            { lockRows: true },
        )));
    }
}
