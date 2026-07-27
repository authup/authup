/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityTypeMap } from '@authup/core-kit';
import { hasOwnProperty } from '@authup/kit';
import type { ObjectLiteral } from '@authup/kit';
import type {
    ClientEntityAPIKey,
    ClientEntityAPIRegistry,
    EntityAPIDispatch,
    IClient,
} from './type';

/**
 * Resolve the client sub-API serving the given entity type, or
 * `undefined` when the type has no API (e.g. `policyAttribute`).
 */
export function pickEntityAPI<
    K extends keyof EntityTypeMap,
    T extends EntityTypeMap[K] & ObjectLiteral = EntityTypeMap[K] & ObjectLiteral,
>(client: IClient, type: K) : EntityAPIDispatch<T> | undefined {
    // The cast-free assignment is a compile-time contract: every
    // entity-keyed client API must serve its EntityTypeMap record type.
    const registry : ClientEntityAPIRegistry = client;

    if (!hasOwnProperty(registry, type)) {
        return undefined;
    }

    // The per-key correspondence is proven by the registry contract
    // above; a generic K cannot carry it through an indexed access.
    return registry[type as ClientEntityAPIKey] as EntityAPIDispatch<T>;
}
