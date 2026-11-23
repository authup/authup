/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { IEntityRepository } from '@authup/server-kit';
import type { OwnedEntityAttributes, OwnedEntityLookupResult } from './types.ts';

/**
 * Find the stored row of a provisioned permission or role.
 *
 * A client-owned row lives in its client's realm. Provisioning once stored
 * such rows without a realm, so when the realm row is missing the lookup
 * falls back to a realm-less row of the same client, which the caller then
 * gives the realm. A realm row always wins: both may exist side by side
 * (the realm-less one written by provisioning, the other through the API).
 */
export async function findOwnedEntity<T extends ObjectLiteral>(
    repository: Pick<IEntityRepository<T>, 'findOneBy'>,
    attributes: OwnedEntityAttributes,
): Promise<OwnedEntityLookupResult<T>> {
    if (!attributes.clientId) {
        return {
            entity: await repository.findOneBy({
                name: attributes.name,
                realmId: attributes.realmId || null,
                clientId: null,
            }),
            realmless: false,
        };
    }

    const entity = await repository.findOneBy({
        name: attributes.name,
        realmId: attributes.realmId || null,
        clientId: attributes.clientId,
    });

    if (entity || !attributes.realmId) {
        return { entity, realmless: false };
    }

    const realmless = await repository.findOneBy({
        name: attributes.name,
        realmId: null,
        clientId: attributes.clientId,
    });

    return { entity: realmless, realmless: !!realmless };
}
