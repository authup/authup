/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityRepository, In, Repository } from 'typeorm';
import { PermissionItem } from '@typescript-auth/core';

import { Client, ClientRole } from '@typescript-auth/common';
import { RoleRepository } from '../role';
import { verifyPassword } from '../../security';

@EntityRepository(Client)
export class ClientRepository extends Repository<Client> {
    // ------------------------------------------------------------------

    async getOwnedPermissions(clientId: string) : Promise<PermissionItem<unknown>[]> {
        let permissions : PermissionItem<unknown>[] = [...await this.getSelfOwnedPermissions(clientId)];

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

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars,class-methods-use-this
    async getSelfOwnedPermissions(clientId: string) : Promise<PermissionItem<unknown>[]> {
        return [];
    }

    /**
     * Find a client by id and secret.
     *
     * @param id
     * @param secret
     */
    async verifyCredentials(id: string, secret: string) : Promise<Client | undefined> {
        const entity : Client | undefined = await this.createQueryBuilder('client')
            .addSelect('client.secret')
            .where('client.id = :id', { id })
            .getOne();

        if (typeof entity === 'undefined') {
            return undefined;
        }

        if (!entity.secret) {
            return undefined;
        }

        const verified = await verifyPassword(secret, entity.secret);
        if (!verified) {
            return undefined;
        }

        return entity;
    }
}
