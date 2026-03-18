/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Realm } from '@authup/core-kit';
import { REALM_MASTER_NAME } from '@authup/core-kit';
import type { IRealmRepository } from '../../../../src/core/entities/realm/types.ts';
import { FakeEntityRepository } from './fake-repository.ts';

export class FakeRealmRepository extends FakeEntityRepository<Realm> implements IRealmRepository {
    private masterRealm: Realm;

    constructor() {
        super();
        this.masterRealm = {
            id: randomUUID(),
            name: REALM_MASTER_NAME,
            display_name: null,
            description: null,
            built_in: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        this.seed([this.masterRealm]);
    }

    async resolve(id: string | undefined, withFallback: true): Promise<Realm>;

    async resolve(id: string | undefined, withFallback?: boolean): Promise<Realm | null>;

    async resolve(id: string | undefined, withFallback?: boolean): Promise<Realm | null> {
        if (id) {
            const entity = await this.findOneByIdOrName(id);
            if (entity) return entity;
        }

        if (withFallback) {
            return this.masterRealm;
        }

        return null;
    }

    getMasterRealm(): Realm {
        return this.masterRealm;
    }
}
