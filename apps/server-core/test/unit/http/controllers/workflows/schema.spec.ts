/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { EntityType } from '@authup/core-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { computeSchemaRegistryHash, describeQuerySchemas } from '../../../../../src/core/index.ts';
import { createTestApplication } from '../../../../app';
import { expectClientError, httpRequest } from '../../../../utils';

describe('src/http/controllers/workflows/schema/*.ts', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should describe every registered schema', async () => {
        const response = await suite.client.schema.getMany();

        expect(response.data.length).toEqual(describeQuerySchemas().length);
        expect(response.meta.total).toEqual(response.data.length);

        const names = response.data.map((entry) => entry.name);
        expect(names).toContain(EntityType.ROLE);

        // ordered by name, so a client can diff two documents positionally
        expect(names).toEqual([...names].sort());
    });

    it('should carry the registry hash, the version and the record parameters', async () => {
        const response = await suite.client.schema.getMany();

        expect(response.meta.hash).toEqual(computeSchemaRegistryHash());
        expect(typeof response.meta.version).toEqual('string');
        expect(response.meta.recordParameters).toEqual(['fields', 'relations']);
    });

    it('should serve the same description a collection response carries', async () => {
        const discovered = await suite.client.schema.getOne(EntityType.ROLE);
        const collection = await suite.client.role.getMany();

        expect(discovered.data).toEqual(collection.meta.schema);
        expect(discovered.meta.hash).toEqual(computeSchemaRegistryHash());
    });

    it('should mark the response private and revalidated', async () => {
        const response = await httpRequest(suite, 'GET', '/schemas', { headers: { Authorization: `Basic ${Buffer.from('admin:start123').toString('base64')}` } });

        expect(response.status).toEqual(200);
        expect(response.headers.get('cache-control')).toEqual('private, no-cache');
    });

    it('should not serve an unknown schema name', async () => {
        await expectClientError(
            () => suite.client.schema.getOne('foo'),
            { status: 404 },
        );
    });

    // The record the lookup walks is a plain object literal, so an inherited
    // member must not answer as if it were a registered schema.
    it('should not serve an inherited property name', async () => {
        await expectClientError(
            () => suite.client.schema.getOne('constructor'),
            { status: 404 },
        );
    });

    it('should refuse an anonymous caller', async () => {
        const response = await httpRequest(suite, 'GET', '/schemas');

        expect(response.status).toEqual(401);
    });
});

describe('src/http/controllers/workflows/schema/*.ts (discovery disabled)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.querySchemaDiscoveryEnabled = false;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should not serve the collection', async () => {
        await expectClientError(
            () => suite.client.schema.getMany(),
            { status: 404 },
        );
    });

    it('should not serve a single schema', async () => {
        await expectClientError(
            () => suite.client.schema.getOne(EntityType.ROLE),
            { status: 404 },
        );
    });
});
