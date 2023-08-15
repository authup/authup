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
import type { EntityListSlotsType } from '../../core';
import { createEntityList, defineDomainListEvents, defineDomainListProps } from '../../core';

export const RoleList = defineComponent({
    props: defineDomainListProps<Role>(),
    slots: Object as SlotsType<EntityListSlotsType<Role>>,
    emits: defineDomainListEvents<Role>(),
    setup(props, ctx) {
        const { render, setDefaults } = createEntityList({
            type: `${DomainType.ROLE}`,
            props,
            setup: ctx,
        });

        setDefaults({
            footerPagination: true,

            headerSearch: true,
            headerTitle: {
                content: 'Roles',
                icon: 'fa-solid fa-user-group',
            },

            noMore: {
                content: 'No more roles available...',
            },
        });

        return () => render();
    },
});

export default RoleList;
