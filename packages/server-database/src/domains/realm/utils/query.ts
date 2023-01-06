/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Brackets, SelectQueryBuilder } from 'typeorm';
import { REALM_MASTER_NAME, Realm, isPropertySet } from '@authup/common';

export function onlyRealmReadableQueryResources<T>(
    query: SelectQueryBuilder<T>,
    input: { id: string, name?: string } | string,
    resourceField: string | string[] = 'realm_id',
) : void {
    let realm : Partial<Realm>;
    if (typeof input === 'string') {
        realm.id = input;
    } else {
        realm = input;
    }

    if (
        isPropertySet(realm, 'name') &&
        realm.name === REALM_MASTER_NAME
    ) {
        return;
    }

    if (typeof realm.id === 'undefined') {
        return;
    }

    query.andWhere(new Brackets((qb) => {
        if (Array.isArray(resourceField)) {
            for (let i = 0; i < resourceField.length; i++) {
                qb.orWhere(
                    `(${resourceField[i]} = :realm${i} OR ${resourceField} IS NULL)`,
                    { [`realm${i}`]: realm.id },
                );
            }
        } else {
            qb.where(
                `(${resourceField} = :realm OR ${resourceField} IS NULL)`,
                { realm: realm.id },
            );
        }
    }));
}
