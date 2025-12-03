/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { useDataSource } from 'typeorm-extension';
import { isUUID } from '@authup/kit';
import type { User } from '@authup/core-kit';
import type { IUserIdentityRepository } from '../../../../core/identity';
import { UserRepository } from '../../domains';

export class UserIdentityRepository implements IUserIdentityRepository {
    async findById(id: string): Promise<User | null> {
        return this.find(id);
    }

    async findByName(id: string, realm?: string): Promise<User | null> {
        return this.find(id, realm);
    }

    private async find(key: string, realmKey?: string) : Promise<User | null> {
        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);
        const query = repository.createQueryBuilder('user')
            .leftJoinAndSelect('user.realm', 'realm');

        if (isUUID(key)) {
            query.where('user.id = :id', { id: key });
        } else {
            query.where('user.name = :name', { name: key });

            if (realmKey) {
                if (isUUID(realmKey)) {
                    query.andWhere('user.realm_id = :realmId', {
                        realmId: realmKey,
                    });
                } else {
                    query.andWhere('realm.name = :realmName', {
                        realmName: realmKey,
                    });
                }
            }
        }

        query.addSelect('user.password');

        const entity = await query.getOne();
        if (entity) {
            await repository.extendOneWithEA(entity);
        }

        return null;
    }
}
