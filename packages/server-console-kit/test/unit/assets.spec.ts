/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createHandler as createAssetsHandler } from '@routup/assets';
import { App } from 'routup';
import { serve } from 'routup/node';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createAssetPathGuard, isAssetRequestPathSafe } from '../../src';

const DIRECTORY = path.resolve('/srv/console/dist/assets');

describe('isAssetRequestPathSafe', () => {
    it('accepts an ordinary asset path', () => {
        expect(isAssetRequestPathSafe('/index-abc123.js', DIRECTORY)).toBe(true);
        expect(isAssetRequestPathSafe('/nested/logo.svg', DIRECTORY)).toBe(true);
        expect(isAssetRequestPathSafe('/', DIRECTORY)).toBe(true);
    });

    it('accepts a child of a filesystem-root directory', () => {
        const { root } = path.parse(DIRECTORY);

        expect(isAssetRequestPathSafe('/index-abc123.js', root)).toBe(true);
        expect(isAssetRequestPathSafe('/nested/logo.svg', root)).toBe(true);
        expect(isAssetRequestPathSafe('/', root)).toBe(true);
    });

    it('refuses a backslash, literal or encoded', () => {
        expect(isAssetRequestPathSafe('/..%5Csecret.txt', DIRECTORY)).toBe(false);
        expect(isAssetRequestPathSafe('/%2e%2e%5csecret.txt', DIRECTORY)).toBe(false);
        expect(isAssetRequestPathSafe('/a\\b.js', DIRECTORY)).toBe(false);
    });

    it('refuses a NUL, literal or encoded', () => {
        expect(isAssetRequestPathSafe('/index.js%00.png', DIRECTORY)).toBe(false);
        expect(isAssetRequestPathSafe('/index.js\0', DIRECTORY)).toBe(false);
    });

    it('refuses a parent segment, literal or encoded', () => {
        expect(isAssetRequestPathSafe('/../secret.txt', DIRECTORY)).toBe(false);
        expect(isAssetRequestPathSafe('/%2e%2e/secret.txt', DIRECTORY)).toBe(false);
        expect(isAssetRequestPathSafe('/%2e%2e%2fsecret.txt', DIRECTORY)).toBe(false);
        expect(isAssetRequestPathSafe('/nested/..', DIRECTORY)).toBe(false);
    });

    it('refuses an undecodable path', () => {
        expect(isAssetRequestPathSafe('/%E0%A4%A.js', DIRECTORY)).toBe(false);
    });
});

describe('createAssetPathGuard', () => {
    let root : string;
    let assetsPath : string;
    let server : ReturnType<typeof serve>;
    let port : number;

    function request(target: string) : Promise<{ status: number, body: string }> {
        // node:http sends the request target verbatim; fetch would resolve
        // the encoded dot segments before the request leaves the client.
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port,
                path: target,
                method: 'GET',
            }, (res) => {
                const chunks : Buffer[] = [];

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                res.on('end', () => resolve({
                    status: res.statusCode ?? 0,
                    body: Buffer.concat(chunks).toString('utf8'),
                }));
            });

            req.on('error', reject);
            req.end();
        });
    }

    beforeAll(async () => {
        root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-assets-'));
        assetsPath = path.join(root, 'assets');

        await fs.promises.mkdir(assetsPath);
        await fs.promises.writeFile(path.join(assetsPath, 'index-abc123.js'), 'export {};');
        await fs.promises.writeFile(path.join(root, 'secret.txt'), 'outside');

        // a file the guard must never let the handler serve
        if (path.sep === '/') {
            await fs.promises.writeFile(path.join(assetsPath, '..\\secret.txt'), 'backslash');
        }

        const app = new App();

        app.use('/assets', createAssetPathGuard(assetsPath));
        app.use('/assets', createAssetsHandler(assetsPath, {
            fallthrough: false,
            scan: false,
        }));

        server = serve(app, { port: 0, silent: true });
        await server.ready();

        port = Number(new URL(server.url ?? '').port);
    });

    afterAll(async () => {
        await server?.close(true);
        await fs.promises.rm(root, { recursive: true, force: true });
    });

    it('serves an ordinary asset', async () => {
        const response = await request('/assets/index-abc123.js');

        expect(response.status).toBe(200);
        expect(response.body).toBe('export {};');
    });

    it('answers 404 for an encoded backslash', async () => {
        const response = await request('/assets/%2e%2e%5csecret.txt');

        expect(response.status).toBe(404);
        expect(response.body).not.toContain('backslash');
        expect(response.body).not.toContain('outside');
    });

    it('answers 404 for encoded parent segments', async () => {
        for (const target of ['/assets/%2e%2e/secret.txt', '/assets/%2e%2e%2fsecret.txt']) {
            const response = await request(target);

            expect(response.status).toBe(404);
            expect(response.body).not.toContain('outside');
        }
    });

    it('answers 404 for an encoded NUL', async () => {
        const response = await request('/assets/index-abc123.js%00');

        expect(response.status).toBe(404);
    });

    it('answers 404 for a missing asset, as before', async () => {
        const response = await request('/assets/missing.js');

        expect(response.status).toBe(404);
    });
});
