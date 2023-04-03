/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isPropertySet } from '../../utils';
import { REALM_MASTER_NAME } from './constants';

/**
 * Check if a realm resource is writable.
 *
 * @param realm
 * @param resourceRealmId
 */
export function isRealmResourceWritable(
    realm?: { id?: string, name?: string},
    resourceRealmId?: null | string | string[],
) : boolean {
    if (Array.isArray(resourceRealmId)) {
        for (let i = 0; i < resourceRealmId.length; i++) {
            if (isRealmResourceWritable(realm, resourceRealmId[i])) {
                return true;
            }
        }

        return false;
    }

    if (!realm) {
        return false;
    }

    if (
        isPropertySet(realm, 'name') &&
        realm.name === REALM_MASTER_NAME
    ) {
        return true;
    }

    return realm.id === resourceRealmId;
}

/**
 * Check if realm resource is readable.
 *
 * @param realm
 * @param resourceRealmId
 */
export function isRealmResourceReadable(
    realm?: { id: string, name?: string },
    resourceRealmId?: string | string[],
) : boolean {
    if (Array.isArray(resourceRealmId)) {
        if (resourceRealmId.length === 0) {
            return true;
        }

        for (let i = 0; i < resourceRealmId.length; i++) {
            if (isRealmResourceReadable(realm, resourceRealmId[i])) {
                return true;
            }
        }

        return false;
    }

    if (typeof realm === 'undefined') {
        return false;
    }

    if (
        isPropertySet(realm, 'name') &&
        realm.name === REALM_MASTER_NAME
    ) {
        return true;
    }

    return !resourceRealmId ||
        realm.id === resourceRealmId;
}

export function isValidRealmName(name: string) : boolean {
    return /^[a-zA-Z0-9-_]{3,128}$/.test(name);
}
