/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import APathForm from '../../../../src/components/entities/path/APathForm.vue';
import { APathPicker, APaths } from '../../../../src/components/entities/path';
import { AFormSubmit } from '../../../../src/components/utility';
import { mountKitComponent } from '../../../utils';

const REALM_ID = '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11';

const collectionHandler = () => ({
    data: [],
    meta: {
        total: 0,
        limit: 10,
        offset: 0,
    },
});

function mountForm(props: Record<string, any> = { realmId: REALM_ID }) {
    return mountKitComponent(APathForm, props, {
        // the parent picker is an entity collection
        'GET /paths': collectionHandler,
        'POST /paths': (request: FakeRequest) => ({
            data: {
                id: '9a5c1d3e-2b4f-4a6c-8d7e-1f2a3b4c5d6e',
                ...(request.body as Record<string, any>),
            },
            meta: {},
        }),
    });
}

function findCreateRequest(httpClient: FakeClient) : FakeRequest | undefined {
    return httpClient.requests.find(
        (request) => request.method === 'POST' &&
            new URL(request.url, 'http://localhost').pathname === '/paths',
    );
}

function findCollectionRequests(httpClient: FakeClient) : FakeRequest[] {
    return httpClient.requests.filter(
        (request) => request.method === 'GET' &&
            new URL(request.url, 'http://localhost').pathname === '/paths',
    );
}

describe('APathForm', () => {
    it('should post the segment name, a null parent and the realm', async () => {
        const { wrapper, httpClient } = mountForm();
        await flushPromises();

        wrapper.findComponent({ name: 'ANameInput' }).vm.$emit('update:modelValue', 'berlin');
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findCreateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({
            name: 'berlin',
            parentId: null,
            realmId: REALM_ID,
        });

        wrapper.unmount();
    });

    // `path` is derived by the server from the parent chain, so the form
    // neither holds nor submits it.
    it('should never send the derived path', async () => {
        const { wrapper, httpClient } = mountForm();
        await flushPromises();

        wrapper.findComponent({ name: 'ANameInput' }).vm.$emit('update:modelValue', 'berlin');
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findCreateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).not.toHaveProperty('path');

        wrapper.unmount();
    });

    // There are no global folders, so an unscoped picker would ask for
    // `realmId = ''` against a uuid column. With no realm the picker is not
    // rendered at all, and it appears once the realm picker sets one.
    it('should not load the parent picker before a realm is known', async () => {
        const { wrapper, httpClient } = mountForm({});
        await flushPromises();

        expect(wrapper.findComponent(APathPicker).exists()).toBe(false);
        expect(findCollectionRequests(httpClient)).toHaveLength(0);

        wrapper.unmount();
    });

    it('should scope the parent picker to the realm it was given', async () => {
        const { wrapper, httpClient } = mountForm();
        await flushPromises();

        expect(wrapper.findComponent(APathPicker).exists()).toBe(true);

        const requests = findCollectionRequests(httpClient);
        expect(requests.length).toBeGreaterThan(0);
        expect(decodeURIComponent(requests[0]!.url)).toContain(`in(realmId,'${REALM_ID}')`);

        wrapper.unmount();
    });
});

describe('APaths', () => {
    // The path schema allows no filter on `name`, so the collection's default
    // search condition would answer `keyNotAllowed` (400). The collection
    // declares its own `queryFilters` hook over the derived full path and the
    // display name instead.
    it('should search the derived path and the display name, never the segment name', async () => {
        const { wrapper, httpClient } = mountKitComponent(APaths, {}, { 'GET /paths': collectionHandler });
        await flushPromises();

        const collection = wrapper.vm as unknown as {
            load: (input: { filters: Record<string, string> }) => Promise<void>
        };
        await collection.load({ filters: { name: 'berlin' } });
        await flushPromises();

        const requests = findCollectionRequests(httpClient);
        const url = decodeURIComponent(requests[requests.length - 1]!.url);

        expect(url).toContain('contains(path,\'berlin\')');
        expect(url).toContain('contains(displayName,\'berlin\')');
        expect(url).not.toContain('contains(name,\'berlin\')');

        wrapper.unmount();
    });
});
