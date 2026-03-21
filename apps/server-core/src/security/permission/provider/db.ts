/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IPermissionRepository,
    PermissionGetOptions,
    PermissionItem,
    PolicyWithType,
} from '@authup/access';
import { buildPermissionItemKey } from '@authup/access';
import type { Permission } from '@authup/core-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { CachePrefix, PermissionEntity, PolicyRepository } from '../../../adapters/database/domains/index.ts';

export class PermissionDatabaseRepository implements IPermissionRepository {
    protected dataSource: DataSource;

    protected repository : Repository<PermissionEntity>;

    protected policyRepository: PolicyRepository;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = this.dataSource.getRepository(PermissionEntity);
        this.policyRepository = new PolicyRepository(this.dataSource);
    }

    async findOne(options: PermissionGetOptions) : Promise<PermissionItem | null> {
        const where : FindOptionsWhere<Permission> = {
            name: options.name,
        };

        if (options.client_id) {
            where.client_id = options.client_id;
        }

        if (options.realm_id) {
            where.realm_id = options.realm_id;
        }

        const entity = await this.repository.findOne({
            where,
            relations: [
                'policy',
            ],
            cache: {
                id: buildCacheKey({
                    prefix: CachePrefix.PERMISSION,
                    key: buildPermissionItemKey({
                        name: options.name,
                        client_id: options.client_id,
                        realm_id: options.realm_id,
                    }),
                }),
                milliseconds: 60_000,
            },
        });

        if (entity) {
            let policy : PolicyWithType | undefined;
            if (entity.policy) {
                policy = await this.policyRepository.findDescendantsTree(entity.policy);
            }

            return {
                name: entity.name,
                realm_id: entity.realm_id,
                client_id: entity.client_id,
                policy,
            };
        }

        return null;
    }
}
