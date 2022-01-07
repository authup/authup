/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Realm } from './entity';

export function buildSocketRealmNamespaceName(realmId: typeof Realm.prototype.id) {
    return `/realm#${realmId}`;
}

export function parseSocketRealmNamespaceName(name: string) : string | undefined {
    return undefined;
}
