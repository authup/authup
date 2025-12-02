/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { useDataSource } from 'typeorm-extension';
import { RealmEntity } from '../entity';

export async function resolveRealm(id: string | undefined) : Promise<RealmEntity | undefined>;
export async function resolveRealm(id: string | undefined, withFallback: true) : Promise<RealmEntity>;
export async function resolveRealm(id: string | undefined, withFallback?: boolean) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    let entity : RealmEntity | null;

    if (id) {
        const query = repository.createQueryBuilder('realm');

        if (isUUID(id)) {
            query.where('realm.id = :id', { id });
        } else {
            query.where('realm.name = :name', { name: id });
        }

        entity = await query.getOne();
    }

    if (!entity && withFallback) {
        entity = await repository.findOne({
            where: {
                name: REALM_MASTER_NAME,
            },
        });
    }

    return entity;
}
