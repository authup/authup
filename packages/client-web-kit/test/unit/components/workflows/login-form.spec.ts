/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { ARealmPicker } from '../../../../src/components/entities';
import { findTokenRequest, mountLoginForm } from '../../../utils';

async function submitWithCredentials(wrapper: VueWrapper<any>) {
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('admin');
    await wrapper.find('input[type="password"]').setValue('start123');

    await wrapper.find('form').trigger('submit');
    await flushPromises();
}

describe('components/workflows/login', () => {
    it('should transmit picker-selected realm', async () => {
        const { wrapper, httpClient } = mountLoginForm();
        await flushPromises();

        const picker = wrapper.findComponent(ARealmPicker);
        expect(picker.exists()).toBe(true);

        picker.vm.$emit('change', ['realm-a']);
        await flushPromises();

        await submitWithCredentials(wrapper);

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({
            grant_type: 'password',
            username: 'admin',
            password: 'start123',
            realm_id: 'realm-a',
        });
    });

    it('should pin realm from codeRequest and hide picker', async () => {
        const { wrapper, httpClient } = mountLoginForm({
            codeRequest: {
                response_type: 'code',
                realm_id: 'realm-b',
            },
        });
        await flushPromises();

        expect(wrapper.findComponent(ARealmPicker).exists()).toBe(false);

        await submitWithCredentials(wrapper);

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({
            grant_type: 'password',
            realm_id: 'realm-b',
        });
    });

    it('should adopt realm of late-arriving codeRequest', async () => {
        const { wrapper, httpClient } = mountLoginForm();
        await flushPromises();

        await wrapper.setProps({
            codeRequest: {
                response_type: 'code',
                realm_id: 'realm-c',
            },
        });
        await flushPromises();

        await submitWithCredentials(wrapper);

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({
            grant_type: 'password',
            realm_id: 'realm-c',
        });
    });

    it('should omit realm_id without selection or codeRequest', async () => {
        const { wrapper, httpClient } = mountLoginForm();
        await flushPromises();

        await submitWithCredentials(wrapper);

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();

        const body = request!.body as Record<string, string>;
        expect(body.grant_type).toEqual('password');
        expect(body.username).toEqual('admin');
        expect(body.password).toEqual('start123');
        expect('realm_id' in body).toBe(false);
    });
});
