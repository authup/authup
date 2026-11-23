/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';

export type IdOrNameCondition = { id: string, name?: never } | { name: string, id?: never };

/**
 * Resolve a key that is an id or a name. A uuid-shaped key is tried as an
 * id first and, when no row has that id, as a name: a name may be shaped
 * like a uuid (a client named after a foreign record's id), and an id match
 * wins over a name match.
 */
export async function findOneByIdOrNameKey<T>(
    key: string,
    find: (where: IdOrNameCondition) => Promise<T | null | undefined>,
): Promise<T | null> {
    if (isUUID(key)) {
        const entity = await find({ id: key });

        if (entity) {
            return entity;
        }
    }

    return (await find({ name: key })) ?? null;
}
