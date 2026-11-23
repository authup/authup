/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import { flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { App } from 'vue';
import {
    createApp,
    getCurrentScope,
    isRef,
    onScopeDispose,
} from 'vue';
import { buildVuecsInstallOptions, runInAppScope } from '../../../../src/core/index.ts';
import { install } from '../../../../src/module.ts';

const noop = () => undefined;

function createKitApp() : App {
    const pinia = createPinia();
    const app = createApp({ render: () => null });

    app.use(pinia);
    install(app, {
        baseURL: 'http://fake.test',
        httpClient: createFakeClient({ handlers: {} }),
        pinia,
        isServer: true,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
    });

    return app;
}

function readScopeWarnings(spy: ReturnType<typeof vi.spyOn>) : string[] {
    return spy.mock.calls
        .map((args: unknown[]) => args.map(String).join(' '))
        .filter((message: string) => message.includes('onScopeDispose'));
}

describe('core/vuecs: buildVuecsInstallOptions', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should build the options without an effect scope warning in the app scope', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
        const app = createKitApp();

        // The lookups register their cleanup only when a scope is active
        // (ilingo >= 6.1 skips it otherwise and the subscriptions leak).
        expect(runInAppScope(app, () => getCurrentScope())).toBeDefined();

        const options = runInAppScope(app, () => buildVuecsInstallOptions({}));

        await flushPromises();

        expect(readScopeWarnings(warn)).toEqual([]);

        const submitButton = options.defaults?.submitButton as Record<string, unknown>;

        expect(isRef(submitButton.createText)).toBe(true);
    });

    it('should stop what ran in the app scope when the app unmounts', () => {
        const app = createKitApp();
        const disposed = vi.fn();

        runInAppScope(app, () => onScopeDispose(disposed));
        runInAppScope(app, () => onScopeDispose(disposed));

        app.mount(document.createElement('div'));

        expect(disposed).not.toHaveBeenCalled();

        app.unmount();

        expect(disposed).toHaveBeenCalledTimes(2);
    });
});
