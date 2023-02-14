/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Brackets, SelectQueryBuilder } from 'typeorm';
import { REALM_MASTER_NAME, Realm, isPropertySet } from '@authup/common';

function prepareRealm(
    input: Partial<Realm> | string,
) : Partial<Realm> | undefined {
    let realm : Partial<Realm> = {};
    if (typeof input === 'string') {
        realm.id = input;
    } else {
        realm = input;
    }

    if (!realm || !realm.id) {
        return undefined;
    }

    if (
        isPropertySet(realm, 'name') &&
        realm.name === REALM_MASTER_NAME
    ) {
        return undefined;
    }

    return realm;
}

export function onlyRealmReadableQueryResources<T>(
    query: SelectQueryBuilder<T>,
    input: Partial<Realm> | string,
    resourceField: string | string[] = 'realm_id',
) : void {
    const realm = prepareRealm(input);
    if (!realm) {
        return;
    }

    query.andWhere(new Brackets((qb) => {
        if (Array.isArray(resourceField)) {
            for (let i = 0; i < resourceField.length; i++) {
                qb.orWhere(
                    `(${resourceField[i]} = :realm${i} OR ${resourceField[i]} IS NULL)`,
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

export function onlyRealmWritableQueryResources<T>(
    query: SelectQueryBuilder<T>,
    input: Partial<Realm> | string,
    resourceField: string | string[] = 'realm_id',
) : void {
    const realm = prepareRealm(input);
    if (!realm) {
        return;
    }

    query.andWhere(new Brackets((qb) => {
        if (Array.isArray(resourceField)) {
            for (let i = 0; i < resourceField.length; i++) {
                qb.orWhere(
                    `${resourceField[i]} = :realm${i}`,
                    { [`realm${i}`]: realm.id },
                );
            }
        } else {
            qb.where(
                `${resourceField} = :realm`,
                { realm: realm.id },
            );
        }
    }));
}
