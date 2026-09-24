/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicy } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IPermissionPolicyRepository } from '../../../../../core/index.ts';
import { PermissionPolicyEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class PermissionPolicyRepositoryAdapter extends EntityRepositoryAdapter<PermissionPolicy> implements IPermissionPolicyRepository {
    constructor(repository: Repository<PermissionPolicy>) {
        super(repository, {
            alias: 'permissionPolicy',
            target: PermissionPolicyEntity,
            entity: 'permission policy',
            realmScope: { column: 'permissionRealmId' },
        });
    }
}
