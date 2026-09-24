/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission, Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IPermissionRepository } from '../../../../../core/index.ts';
import { PermissionEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type PermissionRepositoryAdapterContext = {
    repository: Repository<Permission>,
    realmRepository: Repository<Realm>,
};

export class PermissionRepositoryAdapter extends EntityRepositoryAdapter<Permission> implements IPermissionRepository {
    constructor(ctx: PermissionRepositoryAdapterContext) {
        super(ctx.repository, {
            alias: 'permission',
            target: PermissionEntity,
            entity: 'permission',
            // the per-row realm gate reads `realmId` (issue #3574)
            realmScope: {},
            realmRepository: new RealmRepositoryAdapter(ctx.realmRepository),
        });
    }
}
