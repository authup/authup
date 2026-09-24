/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RoleAttribute } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { EntityRelationLookupError } from 'typeorm-extension';
import type { IRoleAttributeRepository } from '../../../../../core/index.ts';
import { RoleAttributeEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class RoleAttributeRepositoryAdapter extends EntityRepositoryAdapter<RoleAttribute> implements IRoleAttributeRepository {
    constructor(repository: Repository<RoleAttribute>) {
        super(repository, {
            alias: 'roleAttribute',
            target: RoleAttributeEntity,
            entity: 'role attribute',
            realmScope: {},
        });
    }

    override async validateJoinColumns(data: Partial<RoleAttribute>): Promise<void> {
        // a non-uuid owner can reference no row: refuse it the way the lookup
        // does on every dialect, before postgres fails to parse the bind
        if (typeof data.roleId === 'string' && !isUUID(data.roleId)) {
            throw EntityRelationLookupError.notFound('role', ['roleId']);
        }

        await super.validateJoinColumns(data);
    }
}
