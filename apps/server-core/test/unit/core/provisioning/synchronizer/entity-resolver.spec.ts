/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import { 
    beforeEach, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import { ProvisioningEntityResolver } from '../../../../../src/core/provisioning/synchronizer/entity-resolver.ts';

class RecordingRepository extends FakeEntityRepository<ObjectLiteral> {
    public calls: Record<string, any>[] = [];

    async findManyBy(where: Record<string, any>): Promise<ObjectLiteral[]> {
        this.calls.push(where);
        return [];
    }
}

describe('core/provisioning/synchronizer/entity-resolver', () => {
    let repository: RecordingRepository;

    const realmId = 'realm-1';
    const clientId = 'client-1';

    beforeEach(() => {
        repository = new RecordingRepository();
    });

    describe('client-scoped (permissions, roles)', () => {
        let resolver: ProvisioningEntityResolver;

        beforeEach(() => {
            resolver = new ProvisioningEntityResolver(repository);
        });

        it.each([
            ['no names', undefined],
            ['empty names', []],
        ])('should short-circuit on %s', async (_label, names) => {
            expect(await resolver.resolveGlobal(names)).toEqual([]);
            expect(await resolver.resolveRealm(names, realmId)).toEqual([]);
            expect(await resolver.resolveClient(names, realmId, clientId)).toEqual([]);
            expect(repository.calls).toHaveLength(0);
        });

        // The client dimension must stay pinned: without it a global lookup
        // would also match another client's rows.
        it('should pin realm and client for a global lookup', async () => {
            await resolver.resolveGlobal(['foo']);

            expect(repository.calls[0]).toEqual({
                name: ['foo'],
                realmId: null,
                clientId: null,
            });
        });

        it('should pin realm and client for a realm lookup', async () => {
            await resolver.resolveRealm(['foo'], realmId);

            expect(repository.calls[0]).toEqual({
                name: ['foo'],
                realmId,
                clientId: null,
            });
        });

        it('should pin the owning client for a client lookup', async () => {
            await resolver.resolveClient(['foo'], realmId, clientId);

            expect(repository.calls[0]).toEqual({
                name: ['foo'],
                realmId,
                clientId,
            });
        });

        it('should drop the name predicate on a wildcard', async () => {
            await resolver.resolveGlobal(['*']);
            await resolver.resolveRealm(['*'], realmId);
            await resolver.resolveClient(['*'], realmId, clientId);

            expect(repository.calls).toEqual([
                {
                    realmId: null,
                    clientId: null,
                },
                {
                    realmId,
                    clientId: null,
                },
                {
                    realmId,
                    clientId,
                },
            ]);
        });

        it('should canonicalize names', async () => {
            await resolver.resolveGlobal([' Foo ', 'BAR']);

            expect(repository.calls[0].name).toEqual(['foo', 'bar']);
        });
    });

    // Scopes carry no `clientId` column, so the pinned predicate would not
    // compile against the table.
    describe('not client-scoped (scopes)', () => {
        let resolver: ProvisioningEntityResolver;

        beforeEach(() => {
            resolver = new ProvisioningEntityResolver(repository, { clientScoped: false });
        });

        it('should omit the client predicate entirely', async () => {
            await resolver.resolveGlobal(['foo']);
            await resolver.resolveRealm(['foo'], realmId);
            await resolver.resolveGlobal(['*']);

            expect(repository.calls).toEqual([
                {
                    name: ['foo'],
                    realmId: null,
                },
                {
                    name: ['foo'],
                    realmId,
                },
                { realmId: null },
            ]);
        });
    });
});
