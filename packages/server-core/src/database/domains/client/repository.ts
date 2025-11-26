/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Permission, Role } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { CachePrefix } from '../constants';
import { ClientPermissionEntity } from '../client-permission';
import { ClientRoleEntity } from '../client-role';
import { ClientEntity } from './entity';

type FindLazyOptions = {
    /**
     * ID or name
     */
    key: string,
    /**
     * Realm key.
     */
    realmKey?: string,
    withSecret?: boolean,
};

export class ClientRepository extends Repository<ClientEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(ClientEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }

    async getBoundRoles(
        entity: string | Client,
    ) : Promise<Role[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const entities = await this.manager
            .getRepository(ClientRoleEntity)
            .find({
                where: {
                    client_id: id,
                },
                relations: {
                    role: true,
                },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.CLIENT_OWNED_ROLES,
                        key: id,
                    }),
                    milliseconds: 60_000,
                },
            });

        return entities.map((entity) => entity.role);
    }

    async getBoundPermissions(
        entity: string | Client,
    ) : Promise<Permission[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const repository = this.manager.getRepository(ClientPermissionEntity);

        const entities = await repository.find({
            where: {
                client_id: id,
            },
            relations: {
                permission: true,
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_OWNED_PERMISSIONS,
                    key: id,
                }),
                milliseconds: 60_000,
            },
        });

        return entities.map((entity) => entity.permission);
    }

    /**
     * Verify a client by id and secret.
     *
     * @param idOrName
     * @param secret
     * @param realmId
     */
    async verifyCredentials(
        idOrName: string,
        secret: string,
        realmId?: string,
    ) : Promise<ClientEntity | undefined> {
        const entities = await this.findLazy({
            key: idOrName,
            realmKey: realmId,
            withSecret: true,
        });

        for (let i = 0; i < entities.length; i++) {
            if (!entities[i].secret) {
                continue;
            }

            if (entities[i].is_confidential) {
                return entities[i];
            }

            if (secret === entities[i].secret) {
                return entities[i];
            }
        }

        return undefined;
    }

    async findLazy(options: FindLazyOptions) : Promise<ClientEntity[]> {
        const query = this.createQueryBuilder('client')
            .leftJoinAndSelect('client.realm', 'realm');

        if (isUUID(options.key)) {
            query.where('client.id = :id', { id: options.key });
        } else {
            query.where('client.name = :name', { name: options.key });

            if (options.realmKey) {
                if (isUUID(options.realmKey)) {
                    query.andWhere('client.realm_id = :realmId', {
                        realmId: options.realmKey,
                    });
                } else {
                    query.andWhere('realm.name = :realmName', {
                        realmName: options.realmKey,
                    });
                }
            }
        }

        if (options.withSecret) {
            query.addSelect('client.secret');
        }

        return query.getMany();
    }
}
