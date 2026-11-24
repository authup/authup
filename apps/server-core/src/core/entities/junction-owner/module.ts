/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JunctionDefinition, JunctionOwners } from './types.ts';

function readLoadedOwner(row: Record<string, any>, definition: JunctionDefinition): string | null | undefined {
    const loaded = row[definition.relation];

    if (!loaded || typeof loaded.clientId === 'undefined') {
        return undefined;
    }

    return loaded.clientId;
}

/**
 * The owning client of the definition a junction row binds, read from the
 * loaded relation or else from `owners`. A definition found in neither is
 * read as unowned, which no owner check passes.
 */
export function readJunctionOwner(
    row: Record<string, any>,
    definition: JunctionDefinition,
    owners?: JunctionOwners,
): string | null {
    const loaded = readLoadedOwner(row, definition);

    if (typeof loaded !== 'undefined') {
        return loaded;
    }

    return owners?.get(row[definition.key]) ?? null;
}

/**
 * Load the owning client of every definition the rows bind without carrying
 * it, in one lookup.
 */
export async function loadJunctionOwners(
    rows: Record<string, any>[],
    definition: JunctionDefinition,
): Promise<JunctionOwners> {
    const owners: JunctionOwners = new Map();

    const ids = new Set<string>();

    for (const row of rows) {
        const id = row[definition.key];

        if (typeof id === 'string' && typeof readLoadedOwner(row, definition) === 'undefined') {
            ids.add(id);
        }
    }

    if (ids.size === 0) {
        return owners;
    }

    const entities = await definition.repository.findManyBy({ id: [...ids] });

    for (const entity of entities) {
        owners.set(entity.id, entity.clientId ?? null);
    }

    return owners;
}
