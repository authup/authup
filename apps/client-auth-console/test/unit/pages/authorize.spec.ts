/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* global window */

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'vue';
import AuthorizePage from '../../../src/pages/authorize.vue';

const HYDRATION_PAYLOAD = Symbol.for('HYDRATION_PAYLOAD');

const AuthorizeStub = defineComponent({
    name: 'AAuthorize',
    props: {
        federatedLogin: {
            type: Object,
            default: undefined,
        },
    },
    template: '<div class="authorize-stub" />',
});

/**
 * The toast host the page's `failed` handler writes into. `useToast` resolves
 * the manager through `inject`, so providing one satisfies it without the
 * whole overlays install.
 */
const TOAST_MANAGER = Symbol.for('VCToastManager');

const createToastManagerStub = () => ({
    entries: ref([]),
    generateId: () => 'vc-toast-1',
});

type MountOptions = {
    data?: Record<string, any>,
    baseURL?: string,
    url?: string
};

function mountAuthorizePage(options: MountOptions = {}) {
    const {
        data = {}, 
        baseURL = 'http://localhost:3001/', 
        url, 
    } = options;

    if (url) {
        window.history.replaceState({}, '', url);
    }

    return mount(AuthorizePage, {
        global: {
            provide: {
                [HYDRATION_PAYLOAD]: {
                    config: { baseURL },
                    data,
                },
                [TOAST_MANAGER]: createToastManagerStub(),
            },
            stubs: { AAuthorize: AuthorizeStub },
        },
    });
}

describe('authorize page', () => {
    it('hands the federated login hint to the ladder', () => {
        const wrapper = mountAuthorizePage({ data: { federatedLogin: { providerId: 'provider-1' } } });

        expect(wrapper.findComponent(AuthorizeStub).props('federatedLogin'))
            .toEqual({ providerId: 'provider-1' });
    });

    it('passes nothing when the payload carries no hint', () => {
        const wrapper = mountAuthorizePage({ data: {} });

        expect(wrapper.findComponent(AuthorizeStub).props('federatedLogin'))
            .toBeUndefined();
    });

    /**
     * The completion rides a cookie that the first attempt spends, so a
     * reload of the callback's landing URL must not look like a second
     * federated return.
     */
    it('strips the provider hint from the address bar', async () => {
        mountAuthorizePage({
            data: { federatedLogin: { providerId: 'provider-1' } },
            url: '/authorize?client_id=abc&provider=provider-1&state=rp-state',
        });

        const url = new URL(window.location.href);
        expect(url.searchParams.get('provider')).toBeNull();

        // and only that one: the request the page renders survives
        expect(url.searchParams.get('client_id')).toEqual('abc');
        expect(url.searchParams.get('state')).toEqual('rp-state');
    });

    it('leaves an ordinary authorize URL alone', () => {
        mountAuthorizePage({
            data: {},
            url: '/authorize?client_id=abc',
        });

        expect(window.location.search).toEqual('?client_id=abc');
    });
});
