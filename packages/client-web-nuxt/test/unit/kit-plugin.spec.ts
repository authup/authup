/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const state = vi.hoisted(() => ({
    installOptions: undefined as Record<string, unknown> | undefined,
    requestURL: 'http://localhost:3000/',
}));

vi.mock('@authup/client-web-kit', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    install: (_app: unknown, options: Record<string, unknown>) => {
        state.installOptions = options;
    },
}));

vi.mock('#imports', () => ({
    defineNuxtPlugin: (definition: unknown) => definition,
    tryUseNuxtApp: () => undefined,
    useCookie: () => ({ value: undefined }),
    useRequestURL: () => new URL(state.requestURL),
    useRuntimeConfig: () => ({ public: { authup: {} } }),
}));

async function runPlugin(requestURL: string) {
    state.requestURL = requestURL;
    const plugin = (await import('../../src/runtime/plugins/kit')).default as unknown as {
        setup: (ctx: unknown) => void
    };
    plugin.setup({
        vueApp: {},
        $pinia: {},
        payload: { data: {} },
    });

    return state.installOptions;
}

describe('runtime/plugins/kit', () => {
    beforeEach(() => {
        state.installOptions = undefined;
    });

    it('marks the store cookies secure for an https request', async () => {
        const options = await runPlugin('https://app.example.com/users');
        expect(options?.cookieSecure).toBe(true);
    });

    it('leaves the store cookies non-secure for a plain http request', async () => {
        const options = await runPlugin('http://localhost:3000/users');
        expect(options?.cookieSecure).toBe(false);
    });
});
