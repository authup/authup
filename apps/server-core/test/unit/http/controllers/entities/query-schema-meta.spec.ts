/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createFakeRole } from '../../../../utils';
import { createTestApplication } from '../../../../app';

// Issue #1649: every query-capable GET carries the endpoint's queryable
// vocabulary under meta.schema — the static allow-list upper bound, with
// relation capabilities REFERENCED by target schema name instead of being
// expanded inline (nested vocabulary is looked up on that entity's own
// endpoints).
describe('src/http/controllers/entities (query schema meta)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should describe the full query vocabulary on a collection response', async () => {
        const { meta } = await suite.client.role.getMany();

        expect(meta.total).toBeDefined();
        expect(meta.schema).toBeDefined();
        expect(meta.schema!.name).toEqual('role');
        expect(meta.schema!.fields!.allowed).toContain('name');
        expect(meta.schema!.filters!.allowed).toContain('name');
        expect(meta.schema!.sort!.allowed).toContain('name');
        expect(meta.schema!.pagination!.maxLimit).toEqual(50);
        expect(meta.schema!.relations).toEqual({
            allowed: ['realm'],
            schemas: { realm: 'realm' },
        });
    });

    it('should restrict a record response to the parameters a single read processes', async () => {
        const { data: entity } = await suite.client.role.create(createFakeRole());

        const { meta } = await suite.client.role.getOne(entity.id);

        expect(meta.schema).toBeDefined();
        expect(meta.schema!.name).toEqual('role');
        expect(meta.schema!.fields).toBeDefined();
        expect(meta.schema!.relations).toBeDefined();
        expect(meta.schema!.filters).toBeUndefined();
        expect(meta.schema!.sort).toBeUndefined();
        expect(meta.schema!.pagination).toBeUndefined();
    });

    it('should reference relation vocabulary by target schema instead of expanding it', async () => {
        const { meta } = await suite.client.clientPermission.getMany();

        expect(meta.schema!.relations!.schemas).toEqual({
            client: 'client',
            permission: 'permission',
        });
        // the junction's own vocabulary stays flat — no dotted keys
        expect(meta.schema!.filters!.allowed!.every((key) => !key.includes('.'))).toBe(true);
    });

    it('should not describe mutations', async () => {
        const response = await suite.client.role.create(createFakeRole());

        expect(response.meta).toEqual({});
    });

    it('should distinguish an explicitly empty relation allow-list from an undeclared one', async () => {
        const { meta } = await suite.client.realm.getMany();

        // realmSchema pins relations `allowed: []` — nothing includable
        expect(meta.schema!.relations).toEqual({ allowed: [] });
    });
});
