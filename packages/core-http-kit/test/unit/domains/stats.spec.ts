/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { EntityTypeMap } from '@authup/core-kit';
import { createURLCodec } from '@rapiq/codec-url';
import { describe, expect, it } from 'vitest';
import { pickEntityAPI } from '../../../src';
import { createFakeClient } from '../../../src/testing';

const STATS_ENTITY_TYPES = [
    EntityType.CLIENT,
    EntityType.EVENT,
    EntityType.IDENTITY_PROVIDER,
    EntityType.KEY,
    EntityType.PATH,
    EntityType.PERMISSION,
    EntityType.POLICY,
    EntityType.REALM,
    EntityType.ROLE,
    EntityType.SCOPE,
    EntityType.SESSION,
    EntityType.TRUST_ANCHOR,
    EntityType.USER,
];

describe('src/domains/stats', () => {
    it('should expose the schema facet on every entity sub-api', () => {
        const client = createFakeClient();

        for (const type of Object.values(EntityType)) {
            if (type === EntityType.USER_AUTHENTICATOR) {
                continue;
            }

            const api = pickEntityAPI(client, type as keyof EntityTypeMap);
            if (!api) {
                continue;
            }

            expect(api.getSchema, type).toBeTypeOf('function');
            expect(!!api.getStats, type).toBe(STATS_ENTITY_TYPES.includes(type));
        }
    });

    it('should read the @stats facet with the filters, the granularity and the window', async () => {
        const client = createFakeClient({
            handlers: {
                'GET /users/@stats': () => ({
                    data: [{ bucket: '2026-09-22T00:00:00.000Z', count: 1 }],
                    meta: { total: 1 },
                }),
            },
        });

        const { data, meta } = await client.user.getStats({
            filters: { realmId: ['r1', null] },
            granularity: 'hour',
            days: 7,
        });

        expect(data).toHaveLength(1);
        expect(meta.total).toEqual(1);

        const url = new URL(client.requests[0].url, 'http://localhost');
        expect(url.pathname).toEqual('/users/@stats');
        expect(url.searchParams.get('granularity')).toEqual('hour');
        expect(url.searchParams.get('days')).toEqual('7');
        expect(createURLCodec().decode(url.search.slice(1))).toMatchObject({
            filters: {
                operator: 'and',
                value: [{
                    field: 'realmId', 
                    operator: 'in', 
                    value: ['r1', null], 
                }],
            },
        });
    });

    it('should read the bare @stats facet without a query', async () => {
        const client = createFakeClient();

        await client.role.getStats();

        expect(client.requests[0].url).toEqual('roles/@stats');
    });

    it('should read the @schema facet of an entity and of a junction', async () => {
        const client = createFakeClient({
            handlers: {
                'GET /users/@schema': () => ({ data: { name: 'user' }, meta: { recordParameters: ['fields', 'relations'] } }),
                'GET /user-roles/@schema': () => ({ data: { name: 'userRole' }, meta: { recordParameters: ['fields', 'relations'] } }),
            },
        });

        const user = await client.user.getSchema();
        const userRole = await client.userRole.getSchema();

        expect(user.data.name).toEqual('user');
        expect(user.meta.recordParameters).toEqual(['fields', 'relations']);
        expect(userRole.data.name).toEqual('userRole');

        expect(client.requests.map((request) => request.url)).toEqual([
            'users/@schema',
            'user-roles/@schema',
        ]);
    });
});
