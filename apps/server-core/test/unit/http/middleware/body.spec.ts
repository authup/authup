/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { gzipSync } from 'node:zlib';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { createTestApplication } from '../../../app';
import { httpRequest } from '../../../utils';

async function expectBodyRefused(response: Response) {
    expect(response.status).toEqual(400);

    const body = await response.json();
    expect(body.code).toEqual(ErrorCode.BAD_REQUEST);
    expect(body.message).toEqual('request entity too large');
}

describe('body middleware', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should refuse a json body above the default limit', async () => {
        const response = await httpRequest(suite, 'POST', '/authorization/check', {
            headers: { 'content-type': 'application/json' },
            body: `[${' '.repeat(2 * 1024 * 1024)}]`,
        });

        await expectBodyRefused(response);
    });

    it('should measure the limit on the decompressed body', async () => {
        const decoded = Buffer.from(`[${' '.repeat(8 * 1024 * 1024)}]`);

        const response = await httpRequest(suite, 'POST', '/authorization/check', {
            headers: {
                'content-type': 'application/json',
                'content-encoding': 'gzip',
            },
            body: gzipSync(decoded),
        });

        await expectBodyRefused(response);
    });

    it('should refuse a url-encoded body above the default limit', async () => {
        const response = await httpRequest(suite, 'POST', '/authorization/check', { form: { padding: 'a'.repeat(2 * 1024 * 1024) } });

        await expectBodyRefused(response);
    });

    it('should accept an ordinary body', async () => {
        const response = await httpRequest(suite, 'POST', '/authorization/check', {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({}),
        });

        expect(response.status).toEqual(200);
    });
});
