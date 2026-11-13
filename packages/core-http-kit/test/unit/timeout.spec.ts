/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TransportRequest } from 'hapic';
import { MemoryTransport } from 'hapic';
import { describe, expect, it } from 'vitest';
import {
    Client,
    createClientTokenCreator,
    isClientErrorDueTimeout,
} from '../../src';

function createStalledTransport() : MemoryTransport {
    return new MemoryTransport({
        fetch: (request: TransportRequest) => new Promise<never>((_resolve, reject) => {
            const { signal } = request;

            if (!signal) {
                return;
            }

            if (signal.aborted) {
                reject(signal.reason);

                return;
            }

            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    });
}

describe('client timeout', () => {
    it('should reject a call the server never answers as a timeout', async () => {
        const client = new Client({
            baseURL: 'http://authup.test',
            timeout: 20,
            transport: createStalledTransport(),
        });

        const error = await client.status.get().catch((e: unknown) => e);

        expect(isClientErrorDueTimeout(error)).toBe(true);
    });

    it('should bound the client credentials mint by the timeout of the creator client', async () => {
        const creator = createClientTokenCreator({
            id: 'system',
            secret: 'start123',
        }, {
            client: {
                baseURL: 'http://authup.test',
                timeout: 20,
                transport: createStalledTransport(),
            },
        });

        const error = await creator().catch((e: unknown) => e);

        expect(isClientErrorDueTimeout(error)).toBe(true);
    });
});
