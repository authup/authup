/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';

export interface Path {
    id: string;

    name: string;

    /**
     * The full slash path from the realm root, derived by the server from the
     * parent chain and this folder's own `name`. A caller never supplies it.
     */
    path: string;

    displayName: string | null;

    description: string | null;

    createdAt: string;

    updatedAt: string;

    // ------------------------------------------------------------------

    parentId: Path['id'] | null;

    parent: Path | null;

    realmId: Realm['id'];

    realm: Realm;
}
