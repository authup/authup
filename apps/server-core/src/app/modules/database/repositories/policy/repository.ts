/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy, Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IPolicyRepository } from '../../../../../core/index.ts';
import type { PolicyRepository } from '../../../../../adapters/database/domains/index.ts';
import { PolicyEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type PolicyRepositoryAdapterContext = {
    repository: PolicyRepository,
    realmRepository: Repository<Realm>,
};

export class PolicyRepositoryAdapter extends EntityRepositoryAdapter<Policy, PolicyRepository> implements IPolicyRepository {
    constructor(ctx: PolicyRepositoryAdapterContext) {
        super(ctx.repository, {
            alias: 'policy',
            target: PolicyEntity,
            entity: 'policy',
            // the per-row realm gate reads `realmId` (issue #3574)
            realmScope: {},
            realmRepository: new RealmRepositoryAdapter(ctx.realmRepository),
        });
    }

    protected override async extendOne(entity: Policy): Promise<void> {
        await this.repository.extendOneWithEA(entity);
    }

    protected override async extendMany(entities: Policy[]): Promise<void> {
        await this.repository.extendManyWithEA(entities);
    }

    async saveWithEA(entity: Policy, data?: Record<string, any>): Promise<Policy> {
        await this.repository.saveOneWithEA(entity, data);
        await this.repository.updateClosureTable(entity, this.repository.manager);

        return entity;
    }

    async deleteFromTree(entity: Policy): Promise<void> {
        const treeRepository = this.repository.manager.connection.getTreeRepository(PolicyEntity);
        await treeRepository.remove(entity);
    }
}
