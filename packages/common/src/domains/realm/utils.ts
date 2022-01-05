/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Brackets, SelectQueryBuilder } from 'typeorm';
import { MASTER_REALM_ID } from './index';

export function onlyRealmPermittedQueryResources<T>(query: SelectQueryBuilder<T>, realm: string, queryField: string | string[] = 'realm_id') : void {
    if (realm === MASTER_REALM_ID) return;

    query.andWhere(new Brackets((qb) => {
        if (Array.isArray(queryField)) {
            for (let i = 0; i < queryField.length; i++) {
                qb.orWhere(`${queryField[i]} = :realm${i}`, { [`realm${i}`]: realm });
            }
        } else {
            qb.where(`${queryField} = :realm`, { realm });
        }
    }));
}

/**
 * Check if owner realm is permitted for resource realm.
 *
 * @param realmId
 * @param resourceRealmId
 */
export function isPermittedForResourceRealm(realmId?: string, resourceRealmId?: string) : boolean {
    if (typeof realmId === 'undefined') return false;

    if (realmId === MASTER_REALM_ID) return true;

    return realmId === resourceRealmId;
}
