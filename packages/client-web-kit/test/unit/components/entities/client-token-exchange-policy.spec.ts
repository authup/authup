/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityDefaultEventName, EntityType, buildEntityChannelName } from '@authup/core-kit';
import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import { buildEventFullName } from '@authup/core-realtime-kit';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, provide } from 'vue';
import { AClientTokenExchangePolicies } from '../../../../src/components/entities/client-token-exchange-policy';
import AClientTokenExchangePolicyForm from '../../../../src/components/entities/client-token-exchange-policy/AClientTokenExchangePolicyForm.vue';
import { AFormSubmit } from '../../../../src/components/utility';
import { SocketClientSymbol } from '../../../../src/core/socket-manager';
import { mountKitComponent } from '../../../utils';

const CLIENT_ID = '3f5a1c2e-7d4b-4e8a-9c0f-1a2b3c4d5e6f';
const POLICY_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function createPolicy(input: Partial<ClientTokenExchangePolicy> = {}) : ClientTokenExchangePolicy {
    return {
        id: POLICY_ID,
        audience: 'storage',
        capabilityTypes: 'bucket',
        maxLifetime: 600,
        subjectRealmScope: 'own',
        clientId: CLIENT_ID,
        realmId: '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...input,
    } as ClientTokenExchangePolicy;
}

function mountForm(props: Record<string, unknown> = { clientId: CLIENT_ID }) {
    return mountKitComponent(AClientTokenExchangePolicyForm, props, {
        'POST /client-token-exchange-policies': (request: FakeRequest) => ({
            data: {
                ...createPolicy(),
                ...(request.body as Record<string, unknown>),
            },
            meta: {},
        }),
        [`POST /client-token-exchange-policies/${POLICY_ID}`]: (request: FakeRequest) => ({
            data: {
                ...createPolicy(),
                ...(request.body as Record<string, unknown>),
            },
            meta: {},
        }),
    });
}

function findWrite(httpClient: FakeClient, pathname: string) : FakeRequest | undefined {
    return httpClient.requests.find(
        (request) => request.method === 'POST' &&
            new URL(request.url, 'http://localhost').pathname === pathname,
    );
}

function findInputs(wrapper: ReturnType<typeof mountForm>['wrapper']) {
    return wrapper.findAll('input');
}

describe('AClientTokenExchangePolicyForm', () => {
    it('should explain what the capability types and the realm scope values mean', async () => {
        const { wrapper } = mountForm();

        await flushPromises();

        const text = wrapper.text();

        expect(text).toContain('At least one is required; there is no wildcard.');
        expect(text).toContain('Every realm allows users and clients of every realm');
        expect(text).toContain('at most 86400 seconds');

        wrapper.unmount();
    });

    it('should keep submit disabled until the required values are present', async () => {
        const { wrapper, httpClient } = mountForm();

        await flushPromises();

        expect(wrapper.findComponent(AFormSubmit).props('isInvalid')).toBe(true);

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        expect(findWrite(httpClient, '/client-token-exchange-policies')).toBeUndefined();

        wrapper.unmount();
    });

    it('should create a policy for the client, defaulting to the own realm', async () => {
        const { wrapper, httpClient } = mountForm();

        await flushPromises();

        const [audience, capabilityTypes] = findInputs(wrapper);

        await audience!.setValue('storage');
        await capabilityTypes!.setValue('bucket bucket-file');
        await flushPromises();

        expect(wrapper.findComponent(AFormSubmit).props('isInvalid')).toBe(false);

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findWrite(httpClient, '/client-token-exchange-policies');

        expect(request).toBeDefined();
        expect(request!.body).toEqual({
            clientId: CLIENT_ID,
            audience: 'storage',
            capabilityTypes: 'bucket bucket-file',
            maxLifetime: 3600,
            subjectRealmScope: 'own',
        });

        expect(wrapper.emitted('created')).toHaveLength(1);

        wrapper.unmount();
    });

    it('should hydrate an existing policy and update it without the client id', async () => {
        const entity = createPolicy({ subjectRealmScope: 'any' });
        const { wrapper, httpClient } = mountForm({ entity, clientId: CLIENT_ID });

        await flushPromises();

        const [audience, capabilityTypes, maxLifetime] = findInputs(wrapper);

        expect((audience!.element as HTMLInputElement).value).toEqual('storage');
        expect((capabilityTypes!.element as HTMLInputElement).value).toEqual('bucket');
        expect((maxLifetime!.element as HTMLInputElement).value).toEqual('600');

        await maxLifetime!.setValue('60');
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findWrite(httpClient, `/client-token-exchange-policies/${POLICY_ID}`);

        expect(request).toBeDefined();
        expect(request!.body).toEqual({
            audience: 'storage',
            capabilityTypes: 'bucket',
            maxLifetime: 60,
            subjectRealmScope: 'any',
        });

        wrapper.unmount();
    });

    // An update validates like a create, so a cleared field cannot pass here
    // only to be refused by the server.
    it('should refuse an update with a cleared audience', async () => {
        const { wrapper, httpClient } = mountForm({ entity: createPolicy(), clientId: CLIENT_ID });

        await flushPromises();

        const [audience] = findInputs(wrapper);

        await audience!.setValue('');
        await flushPromises();

        expect(wrapper.findComponent(AFormSubmit).props('isInvalid')).toBe(true);

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        expect(findWrite(httpClient, `/client-token-exchange-policies/${POLICY_ID}`)).toBeUndefined();

        wrapper.unmount();
    });

    it.each([['1.5'], ['0'], ['']])('should refuse the max lifetime %j instead of rounding or defaulting it', async (value) => {
        const { wrapper, httpClient } = mountForm({ entity: createPolicy(), clientId: CLIENT_ID });

        await flushPromises();

        const [, , maxLifetime] = findInputs(wrapper);

        await maxLifetime!.setValue(value);
        await flushPromises();

        expect(wrapper.findComponent(AFormSubmit).props('isInvalid')).toBe(true);

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        expect(findWrite(httpClient, `/client-token-exchange-policies/${POLICY_ID}`)).toBeUndefined();

        wrapper.unmount();
    });

    it('should reject a capability type outside the allowed pattern', async () => {
        const { wrapper } = mountForm();

        await flushPromises();

        const [audience, capabilityTypes] = findInputs(wrapper);

        await audience!.setValue('storage');
        await capabilityTypes!.setValue('Not:Valid');
        await flushPromises();

        expect(wrapper.findComponent(AFormSubmit).props('isInvalid')).toBe(true);

        wrapper.unmount();
    });
});

describe('AClientTokenExchangePolicies', () => {
    it('should ignore a realtime event for another client', async () => {
        type Listener = (event: unknown) => void;

        const listeners : Record<string, Listener> = {};
        const socket = {
            emit: () => undefined,
            on: (event: string, listener: Listener) => {
                listeners[event] = listener;
            },
            off: () => undefined,
        };

        const Host = defineComponent({
            setup() {
                provide(SocketClientSymbol, { connect: async () => socket });

                return () => h(
                    AClientTokenExchangePolicies,
                    { query: { filters: { clientId: CLIENT_ID } }, clientId: CLIENT_ID },
                    { item: (props: { data: ClientTokenExchangePolicy }) => h('p', { class: 'row' }, props.data.audience) },
                );
            },
        });

        const { wrapper } = mountKitComponent(Host, {}, {
            'GET /client-token-exchange-policies': () => ({
                data: [createPolicy()],
                meta: {
                    total: 1,
                    limit: 10,
                    offset: 0,
                },
            }),
        });

        await flushPromises();

        const created = listeners[buildEventFullName(EntityType.CLIENT_TOKEN_EXCHANGE_POLICY, EntityDefaultEventName.CREATED)];

        expect(created).toBeDefined();

        const roomName = buildEntityChannelName(EntityType.CLIENT_TOKEN_EXCHANGE_POLICY);

        created!({
            data: createPolicy({
                id: 'b3b1f9e4-6e0c-4f31-8a0e-5a4f3c2d1e0f',
                audience: 'foreign',
                clientId: 'c8a4a3b0-1111-4222-8333-444455556666',
            }),
            meta: { roomName },
        });
        created!({
            data: createPolicy({ id: 'd7c1f9e4-6e0c-4f31-8a0e-5a4f3c2d1e0f', audience: 'own' }),
            meta: { roomName },
        });
        await flushPromises();

        expect(wrapper.findAll('.row').map((row) => row.text())).toEqual(['storage', 'own']);

        wrapper.unmount();
    });

    it('should list the policies of the queried client', async () => {
        const { wrapper, httpClient } = mountKitComponent(
            AClientTokenExchangePolicies,
            { query: { filters: { clientId: CLIENT_ID } } },
            {
                'GET /client-token-exchange-policies': () => ({
                    data: [createPolicy()],
                    meta: {
                        total: 1,
                        limit: 10,
                        offset: 0,
                    },
                }),
            },
            {},
            { slots: { item: '<template #item="props"><p class="row">{{ props.data.audience }}</p></template>' } },
        );

        await flushPromises();

        expect(wrapper.find('.row').text()).toEqual('storage');

        const request = httpClient.requests.find((entry) => entry.method === 'GET');

        expect(decodeURIComponent(request!.url)).toContain(`eq(clientId,'${CLIENT_ID}')`);

        wrapper.unmount();
    });
});
