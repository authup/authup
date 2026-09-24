/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, Scope } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IScopeRepository } from '../../../../../core/index.ts';
import { ScopeEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type ScopeRepositoryAdapterContext = {
    repository: Repository<Scope>,
    realmRepository: Repository<Realm>,
};

export class ScopeRepositoryAdapter extends EntityRepositoryAdapter<Scope> implements IScopeRepository {
    constructor(ctx: ScopeRepositoryAdapterContext) {
        super(ctx.repository, {
            alias: 'scope',
            target: ScopeEntity,
            entity: 'scope',
            // the per-row realm gate reads `realmId` (issue #3574)
            realmScope: {},
            realmRepository: new RealmRepositoryAdapter(ctx.realmRepository),
        });
    }
}
