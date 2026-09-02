/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionEvaluator } from '@authup/access';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { h } from 'vue';
import { APermissionCheck } from '../../../../src/components/entities/permission';
import { install } from '../../../../src/module';
import type { Options } from '../../../../src/types';

const noop = () => undefined;

function mountCheck(name: string) {
    const pinia = createPinia();
    const httpClient = createFakeClient({ handlers: {} });

    const options : Options = {
        baseURL: 'http://fake.test',
        httpClient,
        pinia,
        isServer: true,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
    };

    return mount(APermissionCheck, {
        props: { name },
        slots: { default: () => h('div', { class: 'permission-gated' }) },
        global: { plugins: [pinia, [vuecs, {}], [{ install }, options]] },
    });
}

describe('components/entities/permission-check', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should hide the slot when the permission evaluation fails', async () => {
        vi.spyOn(PermissionEvaluator.prototype, 'preEvaluateOneOf')
            .mockRejectedValue(new Error('denied'));

        const wrapper = mountCheck('user_read');
        await flushPromises();

        // the gate must actually evaluate — a truthy inner Ref object must
        // never render the slot unconditionally (fail-open regression)
        expect(wrapper.find('.permission-gated').exists()).toBe(false);
    });

    it('should render the slot when the permission evaluation passes', async () => {
        vi.spyOn(PermissionEvaluator.prototype, 'preEvaluateOneOf')
            .mockResolvedValue(undefined);

        const wrapper = mountCheck('user_read');
        await flushPromises();

        expect(wrapper.find('.permission-gated').exists()).toBe(true);
    });

    it('should fail closed while a re-evaluation is pending', async () => {
        const { promise: gate, resolve: release } = Promise.withResolvers<void>();

        vi.spyOn(PermissionEvaluator.prototype, 'preEvaluateOneOf')
            .mockImplementation(async (ctx) => {
                if (ctx.name === 'user_read') {
                    return;
                }

                await gate;
            });

        const wrapper = mountCheck('user_read');
        await flushPromises();
        expect(wrapper.find('.permission-gated').exists()).toBe(true);

        // the re-evaluation is pending on the gate — the previously allowed
        // outcome must not keep authorizing the slot in the meantime
        await wrapper.setProps({ name: 'user_update' });
        await flushPromises();
        expect(wrapper.find('.permission-gated').exists()).toBe(false);

        release();
        await flushPromises();
        expect(wrapper.find('.permission-gated').exists()).toBe(true);
    });

    it('should re-evaluate when the name prop changes', async () => {
        const spy = vi.spyOn(PermissionEvaluator.prototype, 'preEvaluateOneOf')
            .mockImplementation(async (ctx) => {
                if (ctx.name !== 'user_read') {
                    throw new Error('denied');
                }
            });

        const wrapper = mountCheck('user_read');
        await flushPromises();
        expect(wrapper.find('.permission-gated').exists()).toBe(true);

        await wrapper.setProps({ name: 'user_delete' });
        await flushPromises();

        expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
        expect(wrapper.find('.permission-gated').exists()).toBe(false);
    });
});
