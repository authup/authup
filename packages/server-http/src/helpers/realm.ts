/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME, isUUID } from '@authup/common';
import { RealmEntity } from '@authup/server-database';
import { useDataSource } from 'typeorm-extension';

export async function findRealm(id: string | undefined) : Promise<RealmEntity | undefined>;
export async function findRealm(id: string | undefined, withFallback: true) : Promise<RealmEntity>;
export async function findRealm(id: string | undefined, withFallback?: boolean) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);
    const query = repository.createQueryBuilder('realm');

    if (withFallback && !id) {
        id = REALM_MASTER_NAME;
    }

    if (isUUID(id)) {
        query.where('realm.id = :id', { id });
    } else {
        query.where('realm.name = :name', { name: id });
    }

    let entity = await query.getOne();

    if (
        !entity &&
        withFallback
    ) {
        entity = await repository.findOne({
            where: {
                name: REALM_MASTER_NAME,
            },
        });
    }

    return entity;
}
