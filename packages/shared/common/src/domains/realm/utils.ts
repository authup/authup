/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MASTER_REALM_ID } from './constants';
/**
 * Check if owner realm is permitted for resource realm.
 *
 * @param realmId
 * @param resourceRealmId
 */
export function isPermittedForResourceRealm(
    realmId?: string,
    resourceRealmId?: string,
) : boolean {
    if (!realmId) return false;

    if (realmId === MASTER_REALM_ID) return true;

    return realmId === resourceRealmId;
}

export function isValidRealmName(name: string) : boolean {
    return /^[a-z0-9-_]{3,36}$/.test(name);
}
