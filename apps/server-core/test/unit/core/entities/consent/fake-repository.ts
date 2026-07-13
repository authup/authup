/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Consent } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    ConsentFindManyOptions,
    ConsentOwner,
    IConsentRepository,
} from '../../../../../src/core/index.ts';

export type ConsentInsertMissingInput = {
    clientId: string,
    realmId: string,
    owner: ConsentOwner,
    scopes: string[]
};

export class FakeConsentRepository implements IConsentRepository {
    public removeCalls: Consent[] = [];

    public insertMissingCalls: ConsentInsertMissingInput[] = [];

    public findManyCalls: { query: Record<string, any>, options: ConsentFindManyOptions }[] = [];

    private consents = new Map<string, Consent>();

    seed(consent: Partial<Consent>): Consent {
        const entity = {
            id: consent.id || randomUUID(),
            expires_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...consent,
        } as Consent;
        this.consents.set(entity.id, entity);
        return entity;
    }

    rows(): Consent[] {
        return [...this.consents.values()];
    }

    async findMany(
        query: Record<string, any>,
        options: ConsentFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Consent>> {
        this.findManyCalls.push({ query, options });

        let data = this.rows();
        if (options.owner) {
            data = data.filter((consent) => this.ownedBy(consent, options.owner!));
        }

        return {
            data,
            meta: {
                total: data.length,
                limit: 50,
                offset: 0,
            },
        };
    }

    async findOneById(id: string): Promise<Consent | null> {
        return this.consents.get(id) ?? null;
    }

    async findAllBySubjectClient(clientId: string, owner: ConsentOwner): Promise<Consent[]> {
        return this.rows().filter(
            (consent) => consent.client_id === clientId && this.ownedBy(consent, owner),
        );
    }

    async insertMissing(input: ConsentInsertMissingInput): Promise<void> {
        this.insertMissingCalls.push(input);

        const existing = await this.findAllBySubjectClient(input.clientId, input.owner);
        const existingTokens = new Set(existing.map((row) => row.scope));

        for (const scope of input.scopes) {
            if (existingTokens.has(scope)) {
                continue;
            }

            this.seed({
                client_id: input.clientId,
                realm_id: input.realmId,
                sub: input.owner.sub,
                sub_kind: input.owner.subKind,
                scope,
                expires_at: null,
            });
        }
    }

    async remove(consent: Consent): Promise<void> {
        this.removeCalls.push(consent);
        this.consents.delete(consent.id);
    }

    private ownedBy(consent: Consent, owner: ConsentOwner): boolean {
        return consent.sub === owner.sub && consent.sub_kind === owner.subKind;
    }
}
