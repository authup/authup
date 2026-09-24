/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAttribute } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { EntityRelationLookupError } from 'typeorm-extension';
import type { IUserAttributeRepository } from '../../../../../core/index.ts';
import { UserAttributeEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class UserAttributeRepositoryAdapter extends EntityRepositoryAdapter<UserAttribute> implements IUserAttributeRepository {
    constructor(repository: Repository<UserAttribute>) {
        super(repository, {
            alias: 'userAttribute',
            target: UserAttributeEntity,
            entity: 'user attribute',
            realmScope: { extraColumns: ['userId'] },
        });
    }

    override async validateJoinColumns(data: Partial<UserAttribute>): Promise<void> {
        // a non-uuid owner can reference no row: refuse it the way the lookup
        // does on every dialect, before postgres fails to parse the bind
        if (typeof data.userId === 'string' && !isUUID(data.userId)) {
            throw EntityRelationLookupError.notFound('user', ['userId']);
        }

        await super.validateJoinColumns(data);
    }
}
