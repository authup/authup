/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mount } from '@vue/test-utils';
import { createPinia, defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const useStore = defineStore('sidebar-spec', () => ({
    status: ref('authenticated'),
    userId: ref('user'),
    realmManagement: ref(null),
    accessTokenExpireDate: ref(null),
    permissionRevision: ref(0),
}));

vi.mock('@authup/client-web-kit', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    injectStore: () => useStore(),
    injectHTTPClient: () => ({ getBaseURL: () => 'http://localhost:3000/' }),
    injectTranslatorLocale: () => ref('en'),
    useTranslator: () => () => '',
    useTranslationsForNamespace: () => reactive({}),
}));

vi.mock('../../src/config/layout', () => ({
    Navigation: class {
        getSideItems() {
            return Promise.resolve([]);
        }
    },
}));

describe('components/sidebar', () => {
    // The resolver awaits its permission checks, so only the watch list
    // re-runs it. A date or time policy flipping changes the verdicts of the
    // same session and moves nothing else.
    it('re-resolves the side items when the session verdicts change', async () => {
        const pinia = createPinia();
        const { default: Sidebar } = await import('../../src/components/sidebar.vue');

        const wrapper = mount(Sidebar, {
            global: {
                plugins: [pinia],
                stubs: {
                    VCNavItems: {
                        name: 'VCNavItems', 
                        props: ['data', 'watch'], 
                        template: '<div />', 
                    },
                    VCCountdown: true,
                    VCIcon: true,
                    ITranslateT: true,
                },
            },
        });

        const watchers = wrapper.findComponent({ name: 'VCNavItems' }).props('watch') as (() => unknown)[];
        const sample = () => watchers.map((fn) => fn());

        const before = sample();
        useStore(pinia).permissionRevision += 1;

        expect(sample()).not.toEqual(before);
    });
});
