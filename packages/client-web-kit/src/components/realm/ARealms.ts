/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Realm } from '@authup/core-kit';
import type { ListSlotsType } from '../../core';
import { createList, defineListEvents, defineListProps } from '../../core';

export const ARealms = defineComponent({
    props: defineListProps<Realm>(),
    slots: Object as SlotsType<ListSlotsType<Realm>>,
    emits: defineListEvents<Realm>(),
    setup(props, ctx) {
        const { render, setDefaults } = createList({
            type: `${DomainType.REALM}`,
            props,
            setup: ctx,
        });

        setDefaults({
            noMore: {
                content: 'No more realms available...',
            },
        });

        return () => render();
    },
});
