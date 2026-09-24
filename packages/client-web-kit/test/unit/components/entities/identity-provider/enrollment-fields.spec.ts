/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, IdentityProviderEnrollmentAttributes } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { defineQuery } from '@rapiq/core';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { VCFormSwitch } from '@vuecs/forms';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import AIdentityProviderEnrollmentFields from '../../../../../src/components/entities/identity-provider/AIdentityProviderEnrollmentFields.vue';
import { install } from '../../../../../src/module';
import type { Options } from '../../../../../src/types';

const noop = () => undefined;

const POLICY_ID = '1b2c3d4e-5f60-4172-8394-a5b6c7d8e9f0';

type EnrollmentEntity = Partial<IdentityProvider & IdentityProviderEnrollmentAttributes>;

function createEntity(attributes: Partial<IdentityProviderEnrollmentAttributes> = {}) : EnrollmentEntity {
    return {
        id: 'f0b1e948-4e69-4b7e-9f0c-1a2b3c4d5e6f',
        name: 'provider',
        displayName: null,
        protocol: IdentityProviderProtocol.OAUTH2,
        preset: null,
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        realmId: 'realm-1',
        ...attributes,
    };
}

function mountFields(props: { entity?: EnrollmentEntity, realmId?: string } = {}) {
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

    const wrapper = mount(AIdentityProviderEnrollmentFields, {
        props,
        global: {
            components: { VCIcon: { render: () => null } },
            stubs: {
                // the picker is a network-backed entity collection; the stub
                // declares its props so hydration and scoping are assertable
                APolicyPicker: {
                    name: 'APolicyPicker',
                    props: ['value', 'query'],
                    template: '<div class="policy-picker-stub" />',
                },
            },
            plugins: [
                pinia,
                [vuecs, {}],
                [{ install }, options],
            ],
        },
    });

    return { wrapper, httpClient };
}

type UpdatedPayload = {
    data: IdentityProviderEnrollmentAttributes,
    valid: boolean,
};

function lastUpdate(wrapper: ReturnType<typeof mountFields>['wrapper']) : UpdatedPayload {
    const emitted = wrapper.emitted<[UpdatedPayload]>('updated');
    expect(emitted).toBeDefined();
    expect(emitted!.length).toBeGreaterThan(0);

    return emitted![emitted!.length - 1]![0];
}

describe('AIdentityProviderEnrollmentFields', () => {
    it('should default to an enabled enrollment with no policy when mounted without an entity', async () => {
        const { wrapper } = mountFields();
        await flushPromises();

        const toggle = wrapper.findComponent(VCFormSwitch);
        expect(toggle.exists()).toBe(true);
        expect(toggle.props('modelValue')).toBe(true);

        const picker = wrapper.findComponent({ name: 'APolicyPicker' });
        expect(picker.exists()).toBe(true);
        expect(picker.props('value')).toBeNull();
        // no realm known: only global policies are offered
        expect(picker.props('query')).toEqual(defineQuery({ filters: { realmId: [null] } }));

        toggle.vm.$emit('update:modelValue', true);
        await flushPromises();

        const update = lastUpdate(wrapper);
        expect(update.valid).toBe(true);
        expect(update.data).toMatchObject({ enrollmentEnabled: true, enrollmentPolicyId: null });
    });

    it('should hydrate the switch and the picker from the entity, scoping the picker to its realm plus global', async () => {
        const { wrapper } = mountFields({ entity: createEntity({ enrollmentEnabled: false, enrollmentPolicyId: POLICY_ID }) });
        await flushPromises();

        expect(wrapper.findComponent(VCFormSwitch).props('modelValue')).toBe(false);

        const picker = wrapper.findComponent({ name: 'APolicyPicker' });
        expect(picker.props('value')).toEqual(POLICY_ID);
        expect(picker.props('query')).toEqual(defineQuery({ filters: { realmId: ['realm-1', null] } }));
    });

    it('should read a null or absent enrollmentEnabled as enabled', async () => {
        const nullCase = mountFields({ entity: createEntity({ enrollmentEnabled: null }) });
        const absentCase = mountFields({ entity: createEntity() });
        await flushPromises();

        expect(nullCase.wrapper.findComponent(VCFormSwitch).props('modelValue')).toBe(true);
        expect(absentCase.wrapper.findComponent(VCFormSwitch).props('modelValue')).toBe(true);
    });

    it('should hydrate a stored null enrollmentPolicyId as null, never as an empty string', async () => {
        // assignFormProperties writes '' for a null, and the server refuses ''
        // as a uuid; only the API's own nullifier hid that on the wire
        const { wrapper } = mountFields({ entity: createEntity({ enrollmentPolicyId: null }) });
        await flushPromises();

        expect(wrapper.findComponent({ name: 'APolicyPicker' }).props('value')).toBeNull();

        wrapper.findComponent(VCFormSwitch).vm.$emit('update:modelValue', false);
        await flushPromises();

        expect(lastUpdate(wrapper).data.enrollmentPolicyId).toBeNull();
    });

    it('should prefer the realmId prop over the entity realm for the picker scope', async () => {
        const { wrapper } = mountFields({
            entity: createEntity(),
            realmId: 'realm-2',
        });
        await flushPromises();

        const picker = wrapper.findComponent({ name: 'APolicyPicker' });
        expect(picker.props('query')).toEqual(defineQuery({ filters: { realmId: ['realm-2', null] } }));
    });

    it('should emit updated with enrollmentEnabled false when the switch is turned off', async () => {
        const { wrapper } = mountFields({ entity: createEntity() });
        await flushPromises();

        wrapper.findComponent(VCFormSwitch).vm.$emit('update:modelValue', false);
        await flushPromises();

        const update = lastUpdate(wrapper);
        expect(update.data).toMatchObject({ enrollmentEnabled: false });
        expect(update.valid).toBe(true);
        expect(wrapper.findComponent(VCFormSwitch).props('modelValue')).toBe(false);
    });

    it('should write the single picked policy id and clear it to null', async () => {
        const { wrapper } = mountFields({ entity: createEntity() });
        await flushPromises();

        const picker = wrapper.findComponent({ name: 'APolicyPicker' });

        picker.vm.$emit('change', [POLICY_ID]);
        await flushPromises();
        expect(lastUpdate(wrapper).data).toMatchObject({ enrollmentPolicyId: POLICY_ID });
        expect(picker.props('value')).toEqual(POLICY_ID);

        picker.vm.$emit('change', []);
        await flushPromises();
        expect(lastUpdate(wrapper).data).toMatchObject({ enrollmentPolicyId: null });
        expect(lastUpdate(wrapper).valid).toBe(true);
    });

    it('should keep an unsaved toggle across an entity refresh that says nothing about it', async () => {
        const entity = createEntity({ enrollmentEnabled: null });
        const { wrapper } = mountFields({ entity });
        await flushPromises();

        wrapper.findComponent(VCFormSwitch).vm.$emit('update:modelValue', false);
        await flushPromises();

        await wrapper.setProps({
            entity: {
                ...entity,
                displayName: 'Renamed',
                updatedAt: '2026-01-03T00:00:00.000Z',
            },
        });
        await flushPromises();

        expect(wrapper.findComponent(VCFormSwitch).props('modelValue')).toBe(false);
    });
});
