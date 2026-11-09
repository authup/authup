/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityDefaultEventName, EntityType, buildEntityChannelName } from '@authup/core-kit';
import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import { buildEventFullName } from '@authup/core-realtime-kit';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, provide } from 'vue';
import { AClientTokenExchangeCapabilities } from '../../../../src/components/entities/client-token-exchange-capability';
import AClientTokenExchangeCapabilityForm from '../../../../src/components/entities/client-token-exchange-capability/AClientTokenExchangeCapabilityForm.vue';
import { AFormSubmit } from '../../../../src/components/utility';
import { SocketClientSymbol } from '../../../../src/core/socket-manager';
import { mountKitComponent } from '../../../utils';

const CLIENT_ID = '3f5a1c2e-7d4b-4e8a-9c0f-1a2b3c4d5e6f';
const CAPABILITY_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function createCapability(input: Partial<ClientTokenExchangeCapability> = {}) : ClientTokenExchangeCapability {
    return {
        id: CAPABILITY_ID,
        audience: 'storage',
        value: 'bucket',
        tokenMaxAge: 600,
        realmScope: 'own',
        clientId: CLIENT_ID,
        realmId: '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...input,
    } as ClientTokenExchangeCapability;
}

function mountForm(props: Record<string, unknown> = { clientId: CLIENT_ID }) {
    return mountKitComponent(AClientTokenExchangeCapabilityForm, props, {
        'POST /client-token-exchange-capabilities': (request: FakeRequest) => ({
            data: {
                ...createCapability(),
                ...(request.body as Record<string, unknown>),
            },
            meta: {},
        }),
        [`POST /client-token-exchange-capabilities/${CAPABILITY_ID}`]: (request: FakeRequest) => ({
            data: {
                ...createCapability(),
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

describe('AClientTokenExchangeCapabilityForm', () => {
    it('should explain what the capabilities and the realm scope values mean', async () => {
        const { wrapper } = mountForm();

        await flushPromises();

        const text = wrapper.text();

        expect(text).toContain('At least one entry is required.');
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

        expect(findWrite(httpClient, '/client-token-exchange-capabilities')).toBeUndefined();

        wrapper.unmount();
    });

    it('should create a capability for the client, defaulting to the own realm', async () => {
        const { wrapper, httpClient } = mountForm();

        await flushPromises();

        const [audience, value] = findInputs(wrapper);

        await audience!.setValue('storage');
        await value!.setValue('bucket bucket-file');
        await flushPromises();

        expect(wrapper.findComponent(AFormSubmit).props('isInvalid')).toBe(false);

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findWrite(httpClient, '/client-token-exchange-capabilities');

        expect(request).toBeDefined();
        expect(request!.body).toEqual({
            clientId: CLIENT_ID,
            audience: 'storage',
            value: 'bucket bucket-file',
            tokenMaxAge: 3600,
            realmScope: 'own',
        });

        expect(wrapper.emitted('created')).toHaveLength(1);

        wrapper.unmount();
    });

    it('should hydrate an existing capability and update it without the client id', async () => {
        const entity = createCapability({ realmScope: 'any' });
        const { wrapper, httpClient } = mountForm({ entity, clientId: CLIENT_ID });

        await flushPromises();

        const [audience, value, tokenMaxAge] = findInputs(wrapper);

        expect((audience!.element as HTMLInputElement).value).toEqual('storage');
        expect((value!.element as HTMLInputElement).value).toEqual('bucket');
        expect((tokenMaxAge!.element as HTMLInputElement).value).toEqual('600');

        await tokenMaxAge!.setValue('60');
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findWrite(httpClient, `/client-token-exchange-capabilities/${CAPABILITY_ID}`);

        expect(request).toBeDefined();
        expect(request!.body).toEqual({
            audience: 'storage',
            value: 'bucket',
            tokenMaxAge: 60,
            realmScope: 'any',
        });

        wrapper.unmount();
    });

    // An update validates like a create, so a cleared field cannot pass here
    // only to be refused by the server.
    it('should refuse an update with a cleared audience', async () => {
        const { wrapper, httpClient } = mountForm({ entity: createCapability(), clientId: CLIENT_ID });

        await flushPromises();

        const [audience] = findInputs(wrapper);

        await audience!.setValue('');
        await flushPromises();

        expect(wrapper.findComponent(AFormSubmit).props('isInvalid')).toBe(true);

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        expect(findWrite(httpClient, `/client-token-exchange-capabilities/${CAPABILITY_ID}`)).toBeUndefined();

        wrapper.unmount();
    });

    it.each([['1.5'], ['0'], ['']])('should refuse the max lifetime %j instead of rounding or defaulting it', async (value) => {
        const { wrapper, httpClient } = mountForm({ entity: createCapability(), clientId: CLIENT_ID });

        await flushPromises();

        const [, , tokenMaxAge] = findInputs(wrapper);

        await tokenMaxAge!.setValue(value);
        await flushPromises();

        expect(wrapper.findComponent(AFormSubmit).props('isInvalid')).toBe(true);

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        expect(findWrite(httpClient, `/client-token-exchange-capabilities/${CAPABILITY_ID}`)).toBeUndefined();

        wrapper.unmount();
    });

    it('should reject a capability type outside the allowed pattern', async () => {
        const { wrapper } = mountForm();

        await flushPromises();

        const [audience, value] = findInputs(wrapper);

        await audience!.setValue('storage');
        await value!.setValue('Not:Valid');
        await flushPromises();

        expect(wrapper.findComponent(AFormSubmit).props('isInvalid')).toBe(true);

        wrapper.unmount();
    });
});

describe('AClientTokenExchangeCapabilities', () => {
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
                    AClientTokenExchangeCapabilities,
                    { query: { filters: { clientId: CLIENT_ID } }, clientId: CLIENT_ID },
                    { item: (props: { data: ClientTokenExchangeCapability }) => h('p', { class: 'row' }, props.data.audience) },
                );
            },
        });

        const { wrapper } = mountKitComponent(Host, {}, {
            'GET /client-token-exchange-capabilities': () => ({
                data: [createCapability()],
                meta: {
                    total: 1,
                    limit: 10,
                    offset: 0,
                },
            }),
        });

        await flushPromises();

        const created = listeners[buildEventFullName(EntityType.CLIENT_TOKEN_EXCHANGE_CAPABILITY, EntityDefaultEventName.CREATED)];

        expect(created).toBeDefined();

        const roomName = buildEntityChannelName(EntityType.CLIENT_TOKEN_EXCHANGE_CAPABILITY);

        created!({
            data: createCapability({
                id: 'b3b1f9e4-6e0c-4f31-8a0e-5a4f3c2d1e0f',
                audience: 'foreign',
                clientId: 'c8a4a3b0-1111-4222-8333-444455556666',
            }),
            meta: { roomName },
        });
        created!({
            data: createCapability({ id: 'd7c1f9e4-6e0c-4f31-8a0e-5a4f3c2d1e0f', audience: 'own' }),
            meta: { roomName },
        });
        await flushPromises();

        expect(wrapper.findAll('.row').map((row) => row.text())).toEqual(['storage', 'own']);

        wrapper.unmount();
    });

    it('should list the capabilities of the queried client', async () => {
        const { wrapper, httpClient } = mountKitComponent(
            AClientTokenExchangeCapabilities,
            { query: { filters: { clientId: CLIENT_ID } } },
            {
                'GET /client-token-exchange-capabilities': () => ({
                    data: [createCapability()],
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
