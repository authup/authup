/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { App, defineCoreHandler } from 'routup';
import { describe, expect, it } from 'vitest';
import { registerRateLimitMiddleware } from '../../../../../../src/adapters/http/middleware/built-in/rate-limit.ts';

// `getRequestIP` reads the socket address off the request, which `App.fetch`
// leaves unset — so the caller under test is spelled by attaching it.
function createRequest(ip: string, headers?: Record<string, string>) {
    return Object.assign(new Request('http://server.test/authorize/info', { headers }), { ip });
}

// `max: 2` only shortens the burst. The bucket a real deployment shares is
// 1200 per minute; the mechanism is the same at either threshold, and the
// caller-supplied value also proves the default `skip` survives the merge.
function createApp(options: ConstructorParameters<typeof App>[0] = {}) {
    const app = new App(options);

    registerRateLimitMiddleware(app, { max: 2 });
    app.get('/authorize/info', defineCoreHandler(() => 'ok'));

    return app;
}

async function burst(app: App, ip: string, count: number) {
    const statuses : number[] = [];

    for (let i = 0; i < count; i++) {
        statuses.push((await app.fetch(createRequest(ip))).status);
    }

    return statuses;
}

describe('registerRateLimitMiddleware', () => {
    it('should not 429 the loopback caller after another client exhausts its quota', async () => {
        const app = createApp();

        await burst(app, '203.0.113.7', 3);

        // The deployment renders its hosted auth pages through an internal
        // client on loopback, so those must keep answering whatever any
        // visitor did — and however many of them there are.
        expect(await burst(app, '127.0.0.1', 5)).toEqual([200, 200, 200, 200, 200]);
    });

    it.each([
        '127.0.0.1',
        '127.13.37.1',
        '::1',
        '::ffff:127.0.0.1',
    ])('should never count the loopback address %s', async (ip) => {
        expect(await burst(createApp(), ip, 3)).toEqual([200, 200, 200]);
    });

    it.each([
        '128.0.0.1',
        '93.184.216.34',
        '0127.0.0.1',
        '127.0.0.1.evil.test',
        '::ffff:127.0.0.1.evil',
    ])('should count %s, which only looks like loopback', async (ip) => {
        expect(await burst(createApp(), ip, 3)).toEqual([200, 200, 429]);
    });

    it.each([
        'constructor',
        '__proto__',
        'toString',
        'not-an-ip',
    ])('should count a forwarded %s like any other key', async (forwarded) => {
        const app = createApp({ options: { trustProxy: true } });
        const statuses : number[] = [];

        for (let i = 0; i < 3; i++) {
            const response = await app.fetch(createRequest('203.0.113.7', { 'x-forwarded-for': forwarded }));
            statuses.push(response.status);
        }

        expect(statuses).toEqual([200, 200, 429]);
    });

    it('should give each client behind a port-appending proxy its own bucket', async () => {
        const app = createApp({ options: { trustProxy: true } });
        const statuses : number[] = [];

        for (const forwarded of ['198.51.100.1:5001', '198.51.100.2:6002', '[2001:db8::3]:443']) {
            const response = await app.fetch(createRequest('10.0.0.5', { 'x-forwarded-for': forwarded }));
            statuses.push(response.status);
        }

        expect(statuses).toEqual([200, 200, 200]);
    });

    it.each([
        ['198.51.100.1:5001', '198.51.100.1:5002', '198.51.100.1:5003'],
        ['[2001:db8::3]:443', '[2001:db8::3]:444', '2001:db8::3'],
    ])('should share one bucket for one host on rotating ports', async (...forwarded) => {
        const app = createApp({ options: { trustProxy: true } });
        const statuses : number[] = [];

        for (const value of forwarded) {
            const response = await app.fetch(createRequest('10.0.0.5', { 'x-forwarded-for': value }));
            statuses.push(response.status);
        }

        expect(statuses).toEqual([200, 200, 429]);
    });
});
