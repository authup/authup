/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Nuxt } from '@nuxt/schema';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import module from '../../src/module';

vi.mock('@nuxt/kit', () => ({
    defineNuxtModule: (definition: { setup: unknown }) => definition.setup,
    installModule: vi.fn(),
    addPlugin: vi.fn(),
    addRouteMiddleware: vi.fn(),
    addTemplate: vi.fn(() => ({ dst: '' })),
    createResolver: () => ({ resolve: (path: string) => path }),
}));

type NuxtStub = {
    options: {
        build: { transpile: string[] },
        runtimeConfig: Record<string, unknown> & { public: Record<string, unknown> },
        alias: Record<string, string>,
    },
    hook: ReturnType<typeof vi.fn>,
};

function createNuxt(runtimeConfig: Record<string, unknown> = {}) : NuxtStub {
    return {
        options: {
            build: { transpile: [] },
            runtimeConfig: { public: {}, ...runtimeConfig },
            alias: {},
        },
        hook: vi.fn(),
    };
}

describe('module', () => {
    it('keeps serverApiURL out of the public runtime config', async () => {
        const nuxt = createNuxt();

        await module(
            { apiURL: 'https://auth.example.com', serverApiURL: 'http://core:3000' },
            nuxt as unknown as Nuxt,
        );

        expect(nuxt.options.runtimeConfig.public.authup).toEqual({ apiURL: 'https://auth.example.com' });
        expect(nuxt.options.runtimeConfig.authup).toEqual({ serverApiURL: 'http://core:3000' });
    });

    it('lets a private runtime config value win over the module option', async () => {
        const nuxt = createNuxt({ authup: { serverApiURL: 'http://mine:3000' } });

        await module({ serverApiURL: 'http://core:3000' }, nuxt as unknown as Nuxt);

        expect(nuxt.options.runtimeConfig.authup).toEqual({ serverApiURL: 'http://mine:3000' });
    });

    it('declares the private key empty without serverApiURL so the environment can fill it', async () => {
        const nuxt = createNuxt();

        await module({ apiURL: 'https://auth.example.com' }, nuxt as unknown as Nuxt);

        expect(nuxt.options.runtimeConfig.public.authup).toEqual({ apiURL: 'https://auth.example.com' });
        expect(nuxt.options.runtimeConfig.authup).toEqual({ serverApiURL: '' });
    });
});
