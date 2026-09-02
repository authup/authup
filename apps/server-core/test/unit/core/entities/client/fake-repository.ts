/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Role } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { PermissionPolicyBinding } from '@authup/access';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IClientRepository } from '../../../../../src/core/entities/client/types.ts';

export class FakeClientRepository extends FakeEntityRepository<Client> implements IClientRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOne(id: string, _query?: IQuery, realm?: string): Promise<Client | null> {
        return this.findOneByIdOrName(id, realm);
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Client | null> {
        return this.findOneBy(where);
    }

    async getBoundRoles(_entity: string | Client): Promise<Role[]> {
        return [];
    }

    async getBoundPermissions(_entity: string | Client): Promise<PermissionPolicyBinding[]> {
        return [];
    }

    transactionCalls = 0;

    async transaction<R>(fn: (repository: IClientRepository) => Promise<R>): Promise<R> {
        this.transactionCalls += 1;
        return fn(this);
    }
}
