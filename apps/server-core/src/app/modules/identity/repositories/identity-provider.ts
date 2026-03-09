/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, IdentityProviderProtocol } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import type { IIdentityProviderRepository } from '../../../../core/index.ts';
import type { IdentityProviderEntity } from '../../../../adapters/database/domains/index.ts';
import { IdentityProviderRepository } from '../../../../adapters/database/domains/index.ts';

export class IdentityProviderRepositoryAdapter implements IIdentityProviderRepository {
    async findByProtocol(protocol: IdentityProviderProtocol, realmKey?: string): Promise<IdentityProvider[]> {
        const dataSource = await useDataSource();
        const repository = new IdentityProviderRepository(dataSource);

        const where: FindOptionsWhere<IdentityProviderEntity> = {
            protocol,
        };

        if (realmKey) {
            if (isUUID(realmKey)) {
                where.realm_id = realmKey;
            } else {
                where.realm = {
                    name: realmKey,
                };
            }
        }

        return repository.findManyWithEA(
            {
                where,
                relations: ['realm'],
            },
        );
    }
}
