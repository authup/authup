/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Client } from '@authup/core';
import type { ListSlotsType } from '../../core';
import { createEntityList, defineListEvents, defineListProps } from '../../core';

export const ClientList = defineComponent({
    props: defineListProps<Client>(),
    slots: Object as SlotsType<ListSlotsType<Client>>,
    emits: defineListEvents<Client>(),
    setup(props, ctx) {
        const { render, setDefaults } = createEntityList({
            type: `${DomainType.CLIENT}`,
            props,
            setup: ctx,
        });

        setDefaults({
            noMore: {
                content: 'No more clients available...',
            },
        });

        return () => render();
    },
    data() {
        return {
            busy: false,
            items: [],
            q: '',
            meta: {
                limit: 10,
                offset: 0,
                total: 0,
            },
            itemBusy: false,
        };
    },
});

export default ClientList;
