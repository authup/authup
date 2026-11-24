/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import APolicyForm from '../../../../../src/components/entities/policy/APolicyForm.vue';
import AClientMatchPolicyForm from '../../../../../src/components/entities/policy/client-match/AClientMatchPolicyForm.vue';
import { AFormSubmit } from '../../../../../src/components/utility/index.ts';
import { mountKitComponent } from '../../../../utils/index.ts';

describe('AClientMatchPolicyForm', () => {
    it('should render for the clientMatch type and submit only its invert flag', async () => {
        const { wrapper, httpClient } = mountKitComponent(
            APolicyForm,
            { type: BuiltInPolicyType.CLIENT_MATCH },
            {
                'POST /policies': () => ({
                    data: {
                        id: '9a5c1d3e-2b4f-4a6c-8d7e-1f2a3b4c5d6e',
                        type: BuiltInPolicyType.CLIENT_MATCH,
                        name: 'owned',
                        invert: false,
                        updatedAt: '2026-01-01T00:00:00.000Z',
                    },
                    meta: {},
                }),
            },
        );

        await flushPromises();

        const form = wrapper.findComponent(AClientMatchPolicyForm);

        expect(form.exists()).toBe(true);
        expect(form.findAll('input')).toHaveLength(0);

        await wrapper.findComponent(AFormSubmit).emit('submit');
        await flushPromises();

        const request = httpClient.requests.find((r) => r.method === 'POST' && r.url === 'policies');

        expect(request).toBeDefined();
        expect(request?.body).toMatchObject({ type: BuiltInPolicyType.CLIENT_MATCH, invert: false });

        wrapper.unmount();
    });
});
