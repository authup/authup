/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityRepository, Repository } from 'typeorm';
import { PermissionItem } from '@typescript-auth/core';

import {
    Client, ClientPermission, ClientRole,
} from '@typescript-auth/domains';
import { RoleRepository } from '../role';
import { verifyPassword } from '../../utils';

@EntityRepository(Client)
export class ClientRepository extends Repository<Client> {
    // ------------------------------------------------------------------

    async getOwnedPermissions(clientId: string) : Promise<PermissionItem<unknown>[]> {
        let permissions : PermissionItem<unknown>[] = await this.getSelfOwnedPermissions(clientId);

        const roles = await this.manager
            .getRepository(ClientRole)
            .find({
                client_id: clientId,
            });

        const roleIds: number[] = roles.map((userRole) => userRole.role_id);

        if (roleIds.length === 0) {
            return permissions;
        }

        const roleRepository = this.manager.getCustomRepository<RoleRepository>(RoleRepository);
        permissions = [...permissions, ...await roleRepository.getOwnedPermissions(roleIds)];

        return permissions;
    }

    async getSelfOwnedPermissions(clientId: string) : Promise<PermissionItem<unknown>[]> {
        const repository = this.manager.getRepository(ClientPermission);

        const entities = await repository.find({
            client_id: clientId,
        });

        const result : PermissionItem<unknown>[] = [];
        for (let i = 0; i < entities.length; i++) {
            result.push({
                id: entities[i].permission_id,
                condition: entities[i].condition,
                power: entities[i].power,
                fields: entities[i].fields,
                negation: entities[i].negation,
            });
        }

        return result;
    }

    /**
     * Verify a client by id and secret.
     *
     * @param id
     * @param secret
     */
    async verifyCredentials(id: string, secret: string) : Promise<Client | undefined> {
        const entity = await this.createQueryBuilder('client')
            .addSelect('client.secret')
            .where('client.id = :id', { id })
            .getOne();

        if (
            !entity ||
            !entity.secret
        ) {
            return undefined;
        }

        const verified = await verifyPassword(secret, entity.secret);
        if (!verified) {
            return undefined;
        }

        return entity;
    }
}
