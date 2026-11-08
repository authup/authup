/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import { EntityConflictError } from '@authup/errors';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IClientTokenExchangePolicyRepository } from '../../../../../src/core/entities/client-token-exchange-policy/types.ts';

export class FakeClientTokenExchangePolicyRepository extends FakeEntityRepository<ClientTokenExchangePolicy>
    implements IClientTokenExchangePolicyRepository {
    async checkUniqueness(data: Partial<ClientTokenExchangePolicy>, existing?: ClientTokenExchangePolicy): Promise<void> {
        const clientId = data.clientId ?? existing?.clientId;
        const audience = data.audience ?? existing?.audience;

        const match = await this.findOneBy({ clientId, audience });

        if (match && match.id !== existing?.id) {
            throw new EntityConflictError({ entity: 'client token exchange policy' });
        }
    }

    /**
     * A copy, as a database read is: merging onto it must not reach the row.
     */
    override async findOneBy(where: Record<string, any>): Promise<ClientTokenExchangePolicy | null> {
        const row = await super.findOneBy(where);

        return row ? { ...row } : null;
    }

    /**
     * What a concurrent request commits while another one is in flight.
     */
    async commit(id: string, data: Partial<ClientTokenExchangePolicy>): Promise<void> {
        const row = await super.findOneBy({ id });

        Object.assign(row!, data);
    }

    transactionCalls = 0;

    /**
     * Runs as the transaction opens, before the callback's locked read: a
     * spec commits a concurrent write here.
     */
    beforeTransaction: (() => Promise<void> | void) | undefined;

    async transaction<R>(fn: (repository: IClientTokenExchangePolicyRepository) => Promise<R>): Promise<R> {
        this.transactionCalls += 1;

        await this.beforeTransaction?.();

        return fn(this);
    }
}
