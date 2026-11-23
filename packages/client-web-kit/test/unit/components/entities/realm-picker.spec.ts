/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { ARealmPicker } from '../../../../src/components/entities/index.ts';
import { mountKitComponent } from '../../../utils/index.ts';

const realms : Partial<Realm>[] = [
    {
        id: 'r1',
        name: 'alpha',
        displayName: 'Alpha',
        description: 'The first realm',
    },
    {
        id: 'r2',
        name: 'beta',
        displayName: null,
        description: null,
    },
];

const handlers = { 'GET /realms': () => ({ data: realms, meta: { total: realms.length } }) };

describe('components/entities/realm/ARealmPicker', () => {
    it('should render tiles by default', async () => {
        const { wrapper } = mountKitComponent(ARealmPicker, {}, handlers);

        await flushPromises();

        expect(wrapper.find('.a-realm-grid').exists()).toBe(true);
        expect(wrapper.findAll('.a-realm-grid-item')).toHaveLength(2);
        expect(wrapper.find('.a-realm-list').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('The first realm');
    });

    it('should render one row per realm with its description in the list layout', async () => {
        const { wrapper } = mountKitComponent(ARealmPicker, { layout: 'list' }, handlers);

        await flushPromises();

        const rows = wrapper.findAll('.a-realm-list-item');

        expect(wrapper.find('.a-realm-grid').exists()).toBe(false);
        expect(rows).toHaveLength(2);
        expect(rows[0]!.find('.a-realm-list-item-name').text()).toEqual('Alpha');
        expect(rows[0]!.find('.a-realm-list-item-slug').text()).toEqual('alpha');
        expect(rows[0]!.find('.a-realm-list-item-description').text()).toEqual('The first realm');
        expect(rows[1]!.find('.a-realm-list-item-description').exists()).toBe(false);

        await rows[1]!.trigger('click');

        expect(wrapper.emitted('select')![0]![0]).toMatchObject({ id: 'r2' });
    });

    it('should render the list skeleton while loading', () => {
        const { wrapper } = mountKitComponent(ARealmPicker, { layout: 'list' }, handlers);

        expect(wrapper.findAll('.a-realm-list-item--skeleton')).toHaveLength(6);
    });

    it('should hand each realm and its select to the item slot', async () => {
        const { wrapper } = mountKitComponent(ARealmPicker, { layout: 'list' }, handlers, {}, { slots: { item: '<template #item="{ realm, select }"><a class="host-row" @click="select">{{ realm.name }}</a></template>' } });

        await flushPromises();

        const rows = wrapper.findAll('.host-row');

        expect(rows.map((row) => row.text())).toEqual(['alpha', 'beta']);
        expect(wrapper.find('.a-realm-list-item').exists()).toBe(false);

        await rows[0]!.trigger('click');

        expect(wrapper.emitted('select')![0]![0]).toMatchObject({ id: 'r1' });
    });

    it('should keep auto-selecting a single realm', async () => {
        const { wrapper } = mountKitComponent(ARealmPicker, { layout: 'list' }, { 'GET /realms': () => ({ data: [realms[0]], meta: { total: 1 } }) });

        await flushPromises();

        expect(wrapper.emitted('select')![0]![0]).toMatchObject({ id: 'r1' });
    });
});
