/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Role } from '@authup/core';
import type { ListSlotsType } from '../../core';
import { createEntityList, defineListEvents, defineListProps } from '../../core';

export const RoleList = defineComponent({
    props: defineListProps<Role>(),
    slots: Object as SlotsType<ListSlotsType<Role>>,
    emits: defineListEvents<Role>(),
    setup(props, ctx) {
        const { render, setDefaults } = createEntityList({
            type: `${DomainType.ROLE}`,
            props,
            setup: ctx,
        });

        setDefaults({
            noMore: {
                content: 'No more roles available...',
            },
        });

        return () => render();
    },
});

export default RoleList;
