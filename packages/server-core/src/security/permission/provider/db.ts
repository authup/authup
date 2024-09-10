/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionGetOptions, PermissionItem, PermissionProvider } from '@authup/kit';
import { useDataSource } from 'typeorm-extension';
import { PermissionEntity } from '../../../domains';

export class PermissionDBProvider implements PermissionProvider {
    async get(options: PermissionGetOptions) : Promise<PermissionItem | undefined> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(PermissionEntity);

        const entity = await repository.findOne({
            where: {
                name: options.name,
                ...(options.realmId ? { realm_id: options.realmId } : {}),
            },
            relations: ['policy'],
        });

        if (entity) {
            return {
                name: entity.name,
                ...(entity.realm_id ? { realm_id: entity.realm_id } : {}),
                policy: entity.policy,
            };
        }

        return undefined;
    }
}
