/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import type { FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../../../src/components/utility';
import { mountKitComponent } from '../../../utils';

function mountScopeCollection(data: Partial<Scope>[] = []) {
    const component = defineComponent({
        props: defineEntityCollectionVProps<Scope>(),
        emits: defineEntityCollectionVEmitOptions<Scope>(),
        setup(props, setup) {
            const manager = defineEntityCollectionManager<'scope'>({
                type: 'scope',
                props,
                setup,
                socket: false,
            });

            return () => manager.render();
        },
    });

    return mountKitComponent(component, {}, {
        'GET /scopes': () => ({
            data,
            meta: {
                total: data.length,
                limit: 10,
                offset: 0,
            },
        }),
    });
}

function filters(requests: FakeRequest[]) : (string | null)[] {
    return requests
        .filter((request) => request.method === 'GET')
        .map((request) => new URL(request.url, 'http://fake.test'))
        .filter((url) => url.pathname === '/scopes')
        .map((url) => url.searchParams.get('filter'));
}

describe('defineEntityCollectionManager (catalog names)', () => {
    it('matches the localized catalog label of a built-in row in the search', async () => {
        const { wrapper, httpClient } = mountScopeCollection();
        await flushPromises();

        await (wrapper.vm as any).load({ filters: { name: 'SIGN-IN' } });

        expect(filters(httpClient.requests)[1]).toEqual(
            `or(contains(name,'SIGN-IN'),contains(displayName,'SIGN-IN'),and(in(name,'${ScopeName.OPEN_ID}'),eq(builtIn,'true'),or(eq(displayName,null),eq(displayName,''))))`,
        );
    });

    it('adds no name branch when no catalog label matches', async () => {
        const { wrapper, httpClient } = mountScopeCollection();
        await flushPromises();

        await (wrapper.vm as any).load({ filters: { name: 'zzz' } });

        expect(filters(httpClient.requests)[1])
            .toEqual("or(contains(name,'zzz'),contains(displayName,'zzz'))");
    });

    it('renders the label over the raw name for a built-in row, the raw name alone otherwise', async () => {
        const { wrapper } = mountScopeCollection([
            {
                id: '1', 
                name: ScopeName.OPEN_ID, 
                builtIn: true, 
            },
            {
                id: '2', 
                name: 'reports', 
                builtIn: false, 
            },
        ]);
        await flushPromises();

        const items = wrapper.findAll('li');
        expect(items).toHaveLength(2);
        expect(items[0].find('small').text()).toEqual(ScopeName.OPEN_ID);
        expect(items[0].text()).toEqual(`OpenID sign-in${ScopeName.OPEN_ID}`);
        expect(items[1].find('small').exists()).toBe(false);
        expect(items[1].text()).toEqual('reports');
    });
});
