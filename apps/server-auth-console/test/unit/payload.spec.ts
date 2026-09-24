/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-http-kit';
import { basic } from '@routup/basic';
import { App, defineCoreHandler } from 'routup';
import { describe, expect, it } from 'vitest';
import { createFeaturesReader, readRenderCookies } from '../../src/payload';

const FEATURES = {
    registration: true,
    passwordRecovery: true,
    emailVerification: false,
    accountConsole: true,
    adminConsole: true,
};

// `status.get` is the only member reached, so the rest of the client stays
// unbuilt rather than faked.
function createStatusClient() {
    const calls : string[] = [];

    const client = {
        status: {
            get: async () => {
                calls.push('GET /');

                return {
                    version: '1.0.0-beta.64',
                    date: '2026-09-03',
                    features: FEATURES,
                };
            },
        },
    } as unknown as Client;

    return { client, calls };
}

describe('createFeaturesReader', () => {
    it('should issue one GET / per reader rather than one per render', async () => {
        const { client, calls } = createStatusClient();
        const readFeatures = createFeaturesReader(client);

        const first = await readFeatures();
        const second = await readFeatures();

        expect(first).toEqual(FEATURES);
        expect(second).toEqual(first);
        expect(calls).toEqual(['GET /']);
    });

    it('should share one GET / across concurrent cache misses', async () => {
        const { promise: gate, resolve: release } = Promise.withResolvers<void>();
        const calls : string[] = [];
        const client = {
            status: {
                get: async () => {
                    calls.push('GET /');
                    await gate;

                    return {
                        version: '1.0.0-beta.64',
                        date: '2026-09-03',
                        features: FEATURES,
                    };
                },
            },
        } as unknown as Client;
        const readFeatures = createFeaturesReader(client);

        const first = readFeatures();
        const second = readFeatures();

        expect(calls).toEqual(['GET /']);

        release();
        await expect(Promise.all([first, second])).resolves.toEqual([FEATURES, FEATURES]);
    });

    it('should hold nothing across readers, so one handler cannot answer for another', async () => {
        // the flags depend on which API the client was built against, and a
        // module-level slot would additionally survive between test cases
        const first = createStatusClient();
        const second = createStatusClient();

        await createFeaturesReader(first.client)();
        await createFeaturesReader(second.client)();

        expect(first.calls).toEqual(['GET /']);
        expect(second.calls).toEqual(['GET /']);
    });

    it('should retry after a failure rather than remembering the API as broken', async () => {
        let attempts = 0;
        const client = {
            status: {
                get: async () => {
                    attempts += 1;
                    if (attempts === 1) {
                        throw new Error('fetch failed');
                    }

                    return {
                        version: '1',
                        date: '1',
                        features: FEATURES,
                    };
                },
            },
        } as unknown as Client;

        const readFeatures = createFeaturesReader(client);

        await expect(readFeatures()).rejects.toThrow();
        expect(await readFeatures()).toEqual(FEATURES);
        expect(attempts).toEqual(2);
    });
});

describe('readRenderCookies', () => {
    async function read(cookie?: string) {
        const app = new App();
        app.use(basic({ cookie: true }));
        app.use(defineCoreHandler({
            method: 'get',
            path: '',
            fn: (event) => readRenderCookies(event),
        }));

        const response = await app.fetch(new Request('http://localhost/', { headers: cookie ? { cookie } : {} }));

        return response.json();
    }

    it('forwards the access token and never the refresh token', async () => {
        await expect(read('access_token=at-1; refresh_token=rt-1; id_token=idt-1'))
            .resolves.toEqual({ access_token: 'at-1' });
    });

    it('forwards nothing for a visitor without a session', async () => {
        await expect(read('refresh_token=rt-1')).resolves.toEqual({});
        await expect(read()).resolves.toEqual({});
    });
});
