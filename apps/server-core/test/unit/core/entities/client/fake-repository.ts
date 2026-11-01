/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, Role } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { PermissionPolicyBinding } from '@authup/access';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IClientRepository } from '../../../../../src/core/entities/client/types.ts';

export class FakeClientRepository extends FakeEntityRepository<Client> implements IClientRepository {
    constructor() {
        // a loaded row carries every column: a realm-bound row always has a realm
        super({ defaults: { realmId: randomUUID() } });
    }

    async checkUniqueness(): Promise<void> {
        // no-op
    }

    // A database read hands out a fresh object, never the stored one, so a
    // merge onto a read row changes nothing until it is saved.
    async findOneBy(where: Record<string, any>): Promise<Client | null> {
        const entity = await super.findOneBy(where);

        return entity ? { ...entity } : null;
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

    /**
     * Runs as the transaction opens, before the callback's locked read: a
     * spec commits a concurrent write here.
     */
    beforeTransaction: (() => Promise<void> | void) | undefined;

    async transaction<R>(fn: (repository: IClientRepository) => Promise<R>): Promise<R> {
        this.transactionCalls += 1;

        await this.beforeTransaction?.();

        return fn(this);
    }
}
