/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from './types';

export function buildSocketRealmNamespaceName(realmId: Realm['id']) {
    return `/realm#${realmId}`;
}

export function parseSocketRealmNamespaceName(name: string) : string | undefined {
    return name.startsWith('/realm#') ?
        name.substring('/realm#'.length) :
        name;
}
