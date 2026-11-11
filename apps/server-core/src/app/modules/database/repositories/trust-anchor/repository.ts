/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { RealmEntity, TrustAnchorEntity } from '../../../../../adapters/database/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import type { ITrustAnchorRepository } from '../../../../../core/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { createRealmNameResolver } from '../realm/repository.ts';

export type TrustAnchorRepositoryAdapterOptions = {
    lockRows?: boolean,
};

export class TrustAnchorRepositoryAdapter extends EntityRepositoryAdapter<TrustAnchor> implements ITrustAnchorRepository {
    constructor(dataSource: DataSource | EntityManager, options: TrustAnchorRepositoryAdapterOptions = {}) {
        super(dataSource.getRepository(TrustAnchorEntity) as unknown as Repository<TrustAnchor>, {
            alias: 'trustAnchor',
            target: TrustAnchorEntity,
            entity: 'trust anchor',
            realmScope: {},
            realmRepository: createRealmNameResolver(dataSource.getRepository(RealmEntity)),
            lockRows: options.lockRows,
        });
    }

    async transaction<R>(fn: (repository: ITrustAnchorRepository) => Promise<R>): Promise<R> {
        const dataSource = this.repository.manager.connection;

        if (!isDatabaseTypeRowLockable(dataSource.options.type)) {
            return fn(this);
        }

        return dataSource.transaction((manager) => fn(new TrustAnchorRepositoryAdapter(manager, { lockRows: true })));
    }
}
