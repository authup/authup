/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientRole } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IClientRoleRepository } from '../../../../../core/entities/client-role/types.ts';
import { ClientRoleEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class ClientRoleRepositoryAdapter extends EntityRepositoryAdapter<ClientRole> implements IClientRoleRepository {
    constructor(repository: Repository<ClientRole>) {
        super(repository, {
            alias: 'clientRole',
            target: ClientRoleEntity,
            entity: 'client role',
            realmScope: { column: 'clientRealmId' },
        });
    }
}
