/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryTransport, isClientError } from 'hapic';
import { describe, expect, it } from 'vitest';
import { createClientTokenCreator, createUserTokenCreator } from '../../src/index.ts';

function createRefusingTransport() : MemoryTransport {
    return new MemoryTransport({
        fetch: () => ({
            status: 400,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ error: 'invalid_client' }),
        }),
    });
}

async function catchError(fn: () => Promise<unknown>) : Promise<unknown> {
    try {
        await fn();
    } catch (e) {
        return e;
    }

    throw new Error('expected a rejection');
}

describe('src/token-creator (failed request)', () => {
    it('should keep the client secret out of the error', async () => {
        const error = await catchError(createClientTokenCreator(
            { id: 'system', secret: 'secret-value' },
            { client: { baseURL: 'http://authup.test', transport: createRefusingTransport() } },
        ));

        expect(isClientError(error)).toBe(true);
        expect((error as { request: { body?: unknown } }).request.body).toBeUndefined();
        expect(String(error)).not.toContain('secret-value');
    });

    it('should keep the password out of the error', async () => {
        const error = await catchError(createUserTokenCreator(
            { name: 'admin', password: 'password-value' },
            { client: { baseURL: 'http://authup.test', transport: createRefusingTransport() } },
        ));

        expect(isClientError(error)).toBe(true);
        expect((error as { request: { body?: unknown } }).request.body).toBeUndefined();
    });

    it('should honor an explicit error transform', async () => {
        const error = await catchError(createClientTokenCreator(
            { id: 'system', secret: 'secret-value' },
            {
                client: {
                    baseURL: 'http://authup.test',
                    transport: createRefusingTransport(),
                    errorTransform: (error) => error,
                },
            },
        ));

        expect(isClientError(error)).toBe(true);
        expect((error as { request: { body?: unknown } }).request.body).toBeDefined();
    });
});
