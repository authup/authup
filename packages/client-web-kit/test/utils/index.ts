/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeHandlerMap, FakeRequest } from '@authup/core-http-kit/testing';
import { mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import { ALoginForm } from '../../src/components/workflows/login';
import { install } from '../../src/module';
import type { Options } from '../../src/types';

const noop = () => undefined;

export function mountLoginForm(
    props: Record<string, any> = {},
    handlers: FakeHandlerMap = {},
) {
    const pinia = createPinia();
    const httpClient = createFakeClient({
        handlers: {
            'POST /token': () => ({
                access_token: 'xyz',
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: 'abc',
            }),
            ...handlers,
        },
    });

    const options : Options = {
        baseURL: 'http://fake.test',
        httpClient,
        pinia,
        isServer: true,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
    };

    const wrapper = mount(ALoginForm, {
        props,
        global: {
            components: { VCIcon: { render: () => null } },
            plugins: [
                pinia,
                [vuecs, {}],
                [{ install }, options],
            ],
        },
    });

    return {
        wrapper, 
        httpClient, 
        pinia, 
    };
}

export function findTokenRequest(httpClient: FakeClient) : FakeRequest | undefined {
    return httpClient.requests.find(
        (request) => request.method === 'POST' &&
            new URL(request.url, 'http://localhost').pathname === '/token',
    );
}
