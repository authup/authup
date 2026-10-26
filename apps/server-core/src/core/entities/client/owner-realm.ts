/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { ValidationError } from '@authup/errors';
import type { Client } from '@authup/core-kit';
import type { ActorContext, IEntityRepository } from '@authup/server-kit';
import type { IRealmRepository } from '../realm/types.ts';

type ClientOwnedInput = {
    clientId?: string | null,
    client?: Pick<Client, 'realmId'> | null,
    realmId?: string | null,
};

/**
 * Settle the realm of a row a client owns: a missing realm takes the
 * owning client's, a different one is refused.
 *
 * Reads the client relation validateJoinColumns loaded onto the input.
 */
export function applyOwningClientRealm(input: ClientOwnedInput): void {
    if (!input.clientId) {
        return;
    }

    if (!input.client) {
        throw new ValidationError('The owning client could not be resolved.');
    }

    if (!input.realmId) {
        input.realmId = input.client.realmId;
        return;
    }

    // Ids are compared case-insensitively: a uuid spelled in upper case
    // names the same realm.
    if (input.realmId.toLowerCase() !== input.client.realmId.toLowerCase()) {
        throw new ValidationError('The realm must be the realm of the owning client.');
    }
}

type ClientOwnedRow = {
    realmId: string | null,
    clientId: string | null,
    client?: Pick<Client, 'realmId'> | null,
};

export type ClientOwnedRowLookupContext<T extends ClientOwnedRow> = {
    repository: Pick<IEntityRepository<T>, 'findOneBy' | 'validateJoinColumns'>,
    realmRepository: Pick<IRealmRepository, 'resolveOrFail'>,
    actor: ActorContext,
    /**
     * The permissions a caller needs to write the entity at all (create and
     * update), checked before the owning client is looked up.
     */
    permissionNames: string[],
};

/**
 * Find the row a save of a client-ownable entity (permission, role)
 * addresses: by id the one row, by name the row a create with the same
 * body would write.
 *
 * - a `realmId` in the body pins that realm (a key that does not resolve
 *   is refused) and, for a name key, the owning client or none;
 * - a UUID key without a realm names one specific row;
 * - a name key with an owning client and no realm pins that client and
 *   its realm;
 * - a name key with neither addresses the global row no client owns.
 */
export async function findClientOwnedRowForSave<T extends ClientOwnedRow>(
    key: string,
    data: Record<string, any>,
    ctx: ClientOwnedRowLookupContext<T>,
): Promise<T | null> {
    const where: Record<string, any> = isUUID(key) ?
        { id: key } :
        { name: key };

    if (typeof data.realmId === 'string') {
        const realm = await ctx.realmRepository.resolveOrFail(data.realmId);
        return ctx.repository.findOneBy({
            ...where,
            realmId: realm.id,
            ...(where.id ? {} : { clientId: typeof data.clientId === 'string' ? data.clientId : null }),
        });
    }

    if (where.id) {
        return ctx.repository.findOneBy(where);
    }

    if (typeof data.clientId === 'string') {
        // The owning client is looked up only once the caller may write the
        // entity at all, so the lookup is no probe for which clients exist.
        // A malformed client id addresses no row; a well-formed one that
        // names no client makes validateJoinColumns refuse the request (400).
        await ctx.actor.permissionEvaluator.preEvaluateOneOf({ name: ctx.permissionNames });

        if (!isUUID(data.clientId)) {
            return null;
        }

        const probe = { clientId: data.clientId } as Partial<T>;
        await ctx.repository.validateJoinColumns(probe);
        if (!probe.client) {
            return null;
        }

        return ctx.repository.findOneBy({
            ...where,
            realmId: probe.client.realmId,
            clientId: data.clientId,
        });
    }

    return ctx.repository.findOneBy({
        ...where,
        realmId: null,
        clientId: null,
    });
}
