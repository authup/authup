/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import { mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import AAccountPrompt from '../../../../src/components/workflows/authorize/AAccountPrompt.vue';
import { install } from '../../../../src/module';
import type { Options } from '../../../../src/types';

const noop = () => undefined;

function mountPrompt(identityName = 'jdoe') {
    const pinia = createPinia();
    const options: Options = {
        baseURL: 'http://fake.test',
        httpClient: createFakeClient({ handlers: {} }),
        pinia,
        isServer: true,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
    };

    return mount(AAccountPrompt, {
        props: { identityName },
        global: {
            components: { VCIcon: { render: () => null } },
            stubs: {
                // render the button as its label + click passthrough
                VCButton: { template: '<button @click="$emit(\'click\', $event)"><slot /></button>' },
            },
            plugins: [pinia, [vuecs, {}], [{ install }, options]],
        },
    });
}

describe('AAccountPrompt', () => {
    it('renders both a continue and a switch action', () => {
        const wrapper = mountPrompt();
        expect(wrapper.findAll('button')).toHaveLength(2);
    });

    it('emits continue on the primary button (continue as X)', async () => {
        const wrapper = mountPrompt();
        await wrapper.findAll('button')[0].trigger('click');
        expect(wrapper.emitted('continue')).toBeTruthy();
        expect(wrapper.emitted('switch')).toBeFalsy();
    });

    it('emits switch on the secondary button (use another account)', async () => {
        const wrapper = mountPrompt();
        await wrapper.findAll('button')[1].trigger('click');
        expect(wrapper.emitted('switch')).toBeTruthy();
        expect(wrapper.emitted('continue')).toBeFalsy();
    });
});
