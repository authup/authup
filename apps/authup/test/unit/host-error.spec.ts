/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, ErrorCode } from '@authup/errors';
import { Client } from '@authup/core-http-kit';
import { describe, expect, it } from 'vitest';
import { describeHostError, runHostCommand } from '../../src/host/error.ts';
import { createHostTransport } from '../utils/host.ts';

async function failingRequest(status: number, body: unknown) : Promise<unknown> {
    const client = new Client({
        baseURL: 'https://auth.example.com',
        transport: createHostTransport({ 'GET /users': () => ({ status, body }) }),
    });
    client.setAuthorizationHeader({ type: 'Bearer', token: 'secret-access' });

    try {
        await client.user.getMany();
    } catch (e) {
        return e;
    }

    throw new Error('expected the request to fail');
}

describe('describeHostError', () => {
    it('renders a server error as code, message and issues', async () => {
        const error = new AuthupError({
            code: ErrorCode.BAD_REQUEST,
            message: 'The request is invalid.',
            issues: [{
                type: 'item',
                code: 'value_invalid',
                path: ['name'],
                message: 'must be at least 3 characters',
            }],
        });

        const text = describeHostError(await failingRequest(400, JSON.parse(JSON.stringify(error))));

        expect(text).toEqual('bad_request: The request is invalid.\n  name: must be at least 3 characters');
    });

    it('renders a non-authup response by hapic\'s message, never the body or the bearer', async () => {
        const text = describeHostError(await failingRequest(502, '<html>gateway</html>'));

        expect(text).toMatch(/502/);
        expect(text).not.toMatch(/gateway|secret-access/);
    });

    it('renders a non-authup JSON body by the message the server chose, never the whole body', async () => {
        const text = describeHostError(await failingRequest(503, { message: 'Service unavailable, retry later.', detail: 'secret-detail' }));

        expect(text).toEqual('Service unavailable, retry later.');
        expect(text).not.toMatch(/secret-detail|secret-access/);
    });

    it('renders any other error by its message', () => {
        expect(describeHostError(new Error('plain'))).toEqual('plain');
        expect(describeHostError('text')).toEqual('text');
    });
});

describe('runHostCommand', () => {
    it('rethrows a plain error carrying the rendered text and no cause', async () => {
        const original = await failingRequest(401, {
            code: 'expired_token',
            message: 'The token expired.',
            '@instanceof': ['@ebec/core/BaseError', '@authup/errors/AuthupError'],
        });

        const rejection = runHostCommand(async () => { throw original; });

        await expect(rejection).rejects.toThrow('expired_token: The token expired.');
        await rejection.catch((e: Error) => {
            expect(e.cause).toBeUndefined();
        });
    });

    it('passes a value through', async () => {
        await expect(runHostCommand(async () => 7)).resolves.toBe(7);
    });
});
