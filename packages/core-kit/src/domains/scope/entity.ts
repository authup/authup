/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';

export interface Scope {
    id: string;

    builtIn: boolean;

    name: string;

    displayName: string | null;

    description: string | null;

    realmId: Realm['id'] | null;

    realm: Realm | null;

    createdAt: string;

    updatedAt: string;
}
