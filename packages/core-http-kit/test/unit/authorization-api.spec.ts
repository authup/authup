/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { createFakeClient } from '../../src/testing';

describe('src/domains/workflows/authorization', () => {
    it('reads GET /authorization with the client credential', async () => {
        const client = createFakeClient({
            handlers: {
                'GET /authorization': () => ({
                    version: 1, 
                    identity: {}, 
                    policies: {}, 
                    permissions: [], 
                }), 
            }, 
        });

        const document = await client.authorization.get();

        expect(document.version).toBe(1);
        expect(client.requests).toHaveLength(1);
        expect(client.requests[0].method).toEqual('GET');
        expect(client.requests[0].url).toEqual('authorization');
        expect(client.requests[0].headers.authorization).toBeUndefined();
    });

    it('sends a per-request bearer when asked to', async () => {
        const client = createFakeClient({
            handlers: {
                'GET /authorization': () => ({
                    version: 1, 
                    identity: {}, 
                    policies: {}, 
                    permissions: [], 
                }), 
            }, 
        });

        await client.authorization.get({ authorizationHeader: { type: 'Bearer', token: 'xyz' } });

        expect(client.requests[0].headers.authorization).toEqual('Bearer xyz');
    });
});
