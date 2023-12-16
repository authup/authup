/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { DomainType } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Permission } from '@authup/core';
import type { ListSlotsType } from '../../core';
import { createList, defineListEvents, defineListProps } from '../../core';

export const PermissionList = defineComponent({
    props: defineListProps<Permission>(),
    slots: Object as SlotsType<ListSlotsType<Permission>>,
    emits: defineListEvents<Permission>(),
    setup(props, setup) {
        const { render, setDefaults } = createList({
            type: `${DomainType.PERMISSION}`,
            props,
            setup,
        });

        setDefaults({
            noMore: {
                content: 'No more permissions available...',
            },
        });

        return () => render();
    },
});
