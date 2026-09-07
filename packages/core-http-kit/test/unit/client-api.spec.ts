/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { createFakeClient } from '../../src/testing';

describe('src/domains/entities/client', () => {
    it('should rotate a secret through POST /clients/:id/secret and hand back the shown-once secret', async () => {
        const client = createFakeClient({
            handlers: {
                'POST /clients/:id/secret': ({ params }) => ({
                    data: { id: params.id, secretHashed: true },
                    meta: { secret: 'plain-once' },
                }),
            },
        });

        const response = await client.client.rotateSecret('abc', { mode: 'hashed' });

        expect(response.meta.secret).toEqual('plain-once');
        expect(response.data.secretHashed).toBe(true);

        expect(client.requests).toHaveLength(1);
        expect(client.requests[0].method).toEqual('POST');
        expect(client.requests[0].url).toMatch(/clients\/abc\/secret$/);
        expect(client.requests[0].body).toEqual({ mode: 'hashed' });
    });

    it('should rotate with an empty body when nothing is supplied', async () => {
        const client = createFakeClient({ handlers: { 'POST /clients/:id/secret': () => ({ data: {}, meta: { secret: 'generated' } }) } });

        const response = await client.client.rotateSecret('abc');

        expect(response.meta.secret).toEqual('generated');
        expect(client.requests[0].body).toEqual({});
    });
});
