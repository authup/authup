/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IPermissionRepository } from '../../../../../src/core/entities/permission/types.ts';

export class FakePermissionRepository extends FakeEntityRepository<Permission> implements IPermissionRepository {
    constructor() {
        // a loaded row carries every column: an unset realm is null, not absent
        super({ defaults: { realmId: null } });
    }

    async checkUniqueness(): Promise<void> {
        // no-op
    }
}
