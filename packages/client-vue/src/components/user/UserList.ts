/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { User } from '@authup/core';
import type { EntityListSlotsType } from '../../core';
import { createEntityList, defineDomainListEvents, defineDomainListProps } from '../../core';

export const UserList = defineComponent({
    props: defineDomainListProps<User>(),
    slots: Object as SlotsType<EntityListSlotsType<User>>,
    emits: defineDomainListEvents<User>(),
    setup(props, ctx) {
        const { render, setDefaults } = createEntityList({
            type: `${DomainType.USER}`,
            props,
            setup: ctx,
        });

        setDefaults({
            footerPagination: true,

            headerSearch: true,
            headerTitle: {
                content: 'Users',
                icon: 'fa-solid fa-user',
            },

            noMore: {
                content: 'No more users available...',
            },
        });

        return () => render();
    },
});

export default UserList;
