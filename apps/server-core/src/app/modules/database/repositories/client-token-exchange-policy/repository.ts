/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IClientTokenExchangePolicyRepository } from '../../../../../core/entities/client-token-exchange-policy/types.ts';
import { ClientTokenExchangePolicyEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class ClientTokenExchangePolicyRepositoryAdapter extends EntityRepositoryAdapter<ClientTokenExchangePolicy>
    implements IClientTokenExchangePolicyRepository {
    constructor(repository: Repository<ClientTokenExchangePolicy>) {
        super(repository, {
            alias: 'tokenExchangePolicy',
            target: ClientTokenExchangePolicyEntity,
            entity: 'client token exchange policy',
            realmScope: { column: 'realmId' },
        });
    }
}
