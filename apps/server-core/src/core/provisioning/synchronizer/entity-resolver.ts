/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { IEntityRepository } from '../../entities/index.ts';

export class ProvisioningEntityResolver<T extends ObjectLiteral = ObjectLiteral> {
    protected repository: IEntityRepository<T>;

    constructor(repository: IEntityRepository<T>) {
        this.repository = repository;
    }

    async resolveGlobal(names?: string[]): Promise<T[]> {
        if (!names || names.length === 0) {
            return [];
        }

        const hasWildcard = names.some((el) => el === '*');
        if (hasWildcard) {
            return this.repository.findManyBy({
                realm_id: null,
                client_id: null,
            });
        }

        return this.repository.findManyBy({
            name: names,
            realm_id: null,
            client_id: null,
        });
    }

    async resolveRealm(names: string[] | undefined, realmId: string): Promise<T[]> {
        if (!names || names.length === 0) {
            return [];
        }

        const hasWildcard = names.some((el) => el === '*');
        if (hasWildcard) {
            return this.repository.findManyBy({
                realm_id: realmId,
                client_id: null,
            });
        }

        return this.repository.findManyBy({
            name: names,
            realm_id: realmId,
            client_id: null,
        });
    }

    async resolveClient(names: string[] | undefined, realmId: string, clientId: string): Promise<T[]> {
        if (!names || names.length === 0) {
            return [];
        }

        const hasWildcard = names.some((el) => el === '*');
        if (hasWildcard) {
            return this.repository.findManyBy({
                realm_id: realmId,
                client_id: clientId,
            });
        }

        return this.repository.findManyBy({
            name: names,
            realm_id: realmId,
            client_id: clientId,
        });
    }
}
