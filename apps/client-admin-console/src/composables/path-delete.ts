/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildPathScopeCondition } from '@authup/client-web-kit';
import type { Client, Path, User } from '@authup/core-kit';
import type { IClient } from '@authup/core-http-kit';
import { and, defineQuery, eq } from '@rapiq/core';
import { PATH_SCOPE_LIMIT, collectPathPages } from './path-scope';

/**
 * What deleting a folder takes with it.
 *
 * A folder delete is never refused on occupancy: the `parentId` cascade
 * removes the subtree and the `pathId` SET NULL unfiles every occupant in the
 * same statement, so the console is the only place the operator learns how
 * much that is. `subtree` is the reading the confirmation is built from; when
 * a count could not be read the dialog says so rather than naming a number it
 * does not have.
 */
export type PathDeleteImpact = {
    /** Folders below the one being deleted, the folder itself excluded. */
    paths: number,
    /** Users filed anywhere in the subtree, unfiled by the delete. */
    users: number,
    /** Clients filed anywhere in the subtree, unfiled by the delete. */
    clients: number,
    /**
     * False when the subtree outgrew the page ceiling or a count read was
     * refused: the numbers above are then meaningless and must not be shown.
     */
    resolved: boolean
};

/**
 * Every folder of the subtree, the folder itself included, as the ids the
 * occupant counts filter by.
 *
 * It pages through {@see collectPathPages}, the same bounded walk the folder
 * scope uses, so one ceiling governs both.
 */
export async function collectPathSubtree(
    client: IClient,
    realmId: string,
    path: string,
) : Promise<{ ids: string[], truncated: boolean }> {
    const collected = await collectPathPages((offset) => client.path.getMany(defineQuery<Path>({
        filters: and(eq('realmId', realmId), buildPathScopeCondition(path)),
        sorts: ['path'],
        pagination: {
            limit: PATH_SCOPE_LIMIT,
            offset,
        },
    })));

    return {
        ids: collected.data.map((entry) => entry.id),
        truncated: collected.truncated,
    };
}

/**
 * Read what a folder delete would unfile.
 *
 * The two occupant counts are `meta.total` reads with `limit: 1`, so nothing
 * but the number travels. A refused count (a reader holding no `USER_READ` /
 * `CLIENT_READ`) or any other failure answers `resolved: false`: the delete
 * still proceeds behind the plain prompt, since an operator who may delete the
 * folder is not blocked by being unable to count what is in it.
 */
export async function readPathDeleteImpact(
    client: IClient,
    realmId: string | null,
    path: string,
) : Promise<PathDeleteImpact> {
    const unresolved : PathDeleteImpact = {
        paths: 0,
        users: 0,
        clients: 0,
        resolved: false,
    };

    if (!realmId) {
        return unresolved;
    }

    try {
        const subtree = await collectPathSubtree(client, realmId, path);
        if (subtree.truncated) {
            return unresolved;
        }

        const [users, clients] = await Promise.all([
            client.user.getMany(defineQuery<User>({
                filters: { pathId: subtree.ids },
                pagination: { limit: 1 },
            })),
            client.client.getMany(defineQuery<Client>({
                filters: { pathId: subtree.ids },
                pagination: { limit: 1 },
            })),
        ]);

        return {
            // the folder itself is in the subtree and is not a subfolder of
            // itself, so it does not count towards what is deleted BELOW it
            paths: Math.max(subtree.ids.length - 1, 0),
            users: users.meta.total,
            clients: clients.meta.total,
            resolved: true,
        };
    } catch {
        return unresolved;
    }
}
