/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MASTER_REALM_ID } from './constants';

/**
 * Check if a realm resource is writable.
 *
 * @param realmId
 * @param resourceRealmId
 */
export function isRealmResourceWritable(
    realmId?: string,
    resourceRealmId?: string | string[],
) : boolean {
    if (Array.isArray(resourceRealmId)) {
        for (let i = 0; i < resourceRealmId.length; i++) {
            if (isRealmResourceWritable(realmId, resourceRealmId[i])) {
                return true;
            }
        }

        return false;
    }

    if (!realmId) return false;

    return realmId === MASTER_REALM_ID ||
        realmId === resourceRealmId;
}

/**
 * Check if realm resource is readable.
 *
 * @param realmId
 * @param resourceRealmId
 */
export function isRealmResourceReadable(
    realmId?: string,
    resourceRealmId?: string | string[],
) : boolean {
    if (Array.isArray(resourceRealmId)) {
        if (resourceRealmId.length === 0) {
            return true;
        }

        for (let i = 0; i < resourceRealmId.length; i++) {
            if (isRealmResourceReadable(realmId, resourceRealmId[i])) {
                return true;
            }
        }

        return false;
    }

    if (!realmId) return false;

    return !resourceRealmId ||
        realmId === MASTER_REALM_ID ||
        realmId === resourceRealmId;
}

export function isValidRealmName(name: string) : boolean {
    return /^[a-z0-9-_]{3,36}$/.test(name);
}
