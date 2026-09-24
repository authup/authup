/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientPermission } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IClientPermissionRepository } from '../../../../../core/entities/client-permission/types.ts';
import { ClientPermissionEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class ClientPermissionRepositoryAdapter extends EntityRepositoryAdapter<ClientPermission> implements IClientPermissionRepository {
    constructor(repository: Repository<ClientPermission>) {
        super(repository, {
            alias: 'clientPermission',
            target: ClientPermissionEntity,
            entity: 'client permission',
            realmScope: { column: 'clientRealmId' },
        });
    }
}
