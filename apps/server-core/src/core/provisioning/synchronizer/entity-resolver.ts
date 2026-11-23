/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { IEntityRepository } from '@authup/server-kit';
import type { IClientRepository } from '../../entities/index.ts';
import type { ProvisioningEntityResolverOptions } from './types.ts';

export class ProvisioningEntityResolver<T extends ObjectLiteral = ObjectLiteral> {
    protected repository: IEntityRepository<T>;

    protected clientScoped: boolean;

    constructor(repository: IEntityRepository<T>, options: ProvisioningEntityResolverOptions = {}) {
        this.repository = repository;
        this.clientScoped = options.clientScoped ?? true;
    }

    async resolveGlobal(names?: string[]): Promise<T[]> {
        return this.resolve(names, { realmId: null });
    }

    async resolveRealm(names: string[] | undefined, realmId: string): Promise<T[]> {
        return this.resolve(names, { realmId });
    }

    async resolveClient(names: string[] | undefined, realmId: string, clientId: string): Promise<T[]> {
        return this.resolve(names, { realmId }, clientId);
    }

    /**
     * Resolve a relation keyed by client name (`{ <client>: [<names>] }`)
     * onto the rows those clients of the realm own. A client that does not
     * exist resolves nothing.
     */
    async resolveClientOwned(
        relation: Record<string, string[]> | undefined,
        realmId: string,
        clientRepository: Pick<IClientRepository, 'findOneBy'>,
    ): Promise<T[]> {
        if (!relation) {
            return [];
        }

        const output: T[] = [];

        for (const [clientName, names] of Object.entries(relation)) {
            const client = await clientRepository.findOneBy({
                name: clientName.trim().toLowerCase(),
                realmId,
            });

            if (client) {
                output.push(...await this.resolveClient(names, realmId, client.id));
            }
        }

        return output;
    }

    protected async resolve(
        names: string[] | undefined,
        where: Record<string, any>,
        clientId: string | null = null,
    ): Promise<T[]> {
        if (!names || names.length === 0) {
            return [];
        }

        names = names.map((name) => name.trim().toLowerCase());

        // A client-ownable entity must never resolve another owner's rows, so
        // the client dimension is always pinned. Entities without one (scope)
        // opt out, because the predicate would not compile against the table.
        const conditions = this.clientScoped ?
            {
                ...where,
                clientId,
            } :
            where;

        if (names.includes('*')) {
            return this.repository.findManyBy(conditions);
        }

        return this.repository.findManyBy({
            ...conditions,
            name: names,
        });
    }
}
