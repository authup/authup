/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import { RealmEntity, TrustAnchorEntity } from '../../../../../adapters/database/index.ts';
import type { ITrustAnchorRepository } from '../../../../../core/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export class TrustAnchorRepositoryAdapter extends EntityRepositoryAdapter<TrustAnchor> implements ITrustAnchorRepository {
    constructor(dataSource: DataSource) {
        super(dataSource.getRepository(TrustAnchorEntity) as unknown as Repository<TrustAnchor>, {
            alias: 'trustAnchor',
            target: TrustAnchorEntity,
            entity: 'trust anchor',
            realmScope: {},
            realmRepository: new RealmRepositoryAdapter(dataSource.getRepository(RealmEntity)),
        });
    }
}
