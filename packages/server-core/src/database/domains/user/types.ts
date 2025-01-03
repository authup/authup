/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserRelationItemSyncOperation } from './constants';

export type UserRelationSyncItem = {
    id: string,
    realmId?: string | null,
    operation?: `${UserRelationItemSyncOperation}`
};

export type UserRelationSaveContext = {
    id: string,
    realmId: string,
    items: (string | UserRelationSyncItem)[]
};
