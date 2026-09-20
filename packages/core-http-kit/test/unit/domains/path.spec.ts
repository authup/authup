/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { pickEntityAPI } from '../../../src';
import { createFakeClient } from '../../../src/testing';

describe('src/domains/entities/path', () => {
    it('should call the paths routes', async () => {
        const client = createFakeClient({
            handlers: {
                'POST /paths': (request) => ({ data: { id: 'p1', ...(request.body as Record<string, any>) }, meta: {} }),
                'GET /paths/p1': () => ({
                    data: {
                        id: 'p1', 
                        name: 'berlin', 
                        path: 'sales/berlin', 
                    },
                    meta: {}, 
                }),
            },
        });

        const created = await client.path.create({ name: 'berlin', parentId: 'p0' });
        expect(created.data.id).toBe('p1');
        expect(created.data.parentId).toBe('p0');

        const { data } = await client.path.getOne('p1');
        expect(data.path).toBe('sales/berlin');

        expect(client.requests).toHaveLength(2);
        expect(client.requests[0].method).toEqual('POST');
        expect(client.requests[0].url).toMatch(/paths$/);
        expect(client.requests[1].method).toEqual('GET');
        expect(client.requests[1].url).toMatch(/paths\/p1$/);
    });

    it('should resolve the sub-api by entity type', () => {
        const client = createFakeClient();

        expect(client.path).toBeDefined();
        expect(pickEntityAPI(client, 'path')).toBe(client.path);
    });
});
