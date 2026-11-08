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
}
