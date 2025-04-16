/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useDataSource } from 'typeorm-extension';
import { PermissionEntity, RoleEntity } from '../../database/domains';
import type { Component } from '../types';

export class DatabaseUniqueEntriesComponent implements Component {
    /**
     * Thus a unique check failed for mysql driver,
     * existing duplicate entries must be removed.
     */
    async start() {
        await this.enforceUniqueRoles();
        await this.enforceUniquePermissions();
    }

    async enforceUniqueRoles() {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(RoleEntity);
        const queryBuilder = repository.createQueryBuilder('role');

        queryBuilder.orderBy('role.created_at', 'ASC');

        const entities = await queryBuilder.getMany();
        const aggregated = entities.reduce((prev, curr) => {
            const key = this.buildKey({
                name: curr.name,
                client_id: curr.client_id,
                realm_id: curr.realm_id,
            });

            if (Array.isArray(prev[key])) {
                prev[key].push(curr);
            } else {
                prev[key] = [curr];
            }

            return prev;
        }, {} as Record<string, RoleEntity[]>);

        const keys = Object.keys(aggregated);
        for (let i = 0; i < keys.length; i++) {
            const [, ...rest] = aggregated[keys[i]];
            if (rest.length === 0) {
                continue;
            }

            await repository.remove(rest);
        }
    }

    async enforceUniquePermissions() {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(PermissionEntity);
        const queryBuilder = repository.createQueryBuilder('permission');

        queryBuilder.orderBy('permission.created_at', 'ASC');

        const entities = await queryBuilder.getMany();
        const aggregated = entities.reduce((prev, curr) => {
            const key = this.buildKey({
                name: curr.name,
                client_id: curr.client_id,
                realm_id: curr.realm_id,
            });

            if (Array.isArray(prev[key])) {
                prev[key].push(curr);
            } else {
                prev[key] = [curr];
            }

            return prev;
        }, {} as Record<string, PermissionEntity[]>);

        const keys = Object.keys(aggregated);
        for (let i = 0; i < keys.length; i++) {
            const [, ...rest] = aggregated[keys[i]];
            if (rest.length === 0) {
                continue;
            }

            await repository.remove(rest);
        }
    }

    protected buildKey(props: Record<string, string | null>) {
        const keys = Object.keys(props);

        return keys
            .map((key) => (typeof props[key] === 'string' ? props[key] : `${props[key]}`))
            .join(':');
    }
}
