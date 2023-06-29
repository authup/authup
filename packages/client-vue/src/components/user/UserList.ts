/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { User } from '@authup/core';
import type { DomainListSlotsType } from '../../core/render';
import { createDomainListBuilder, defineDomainListEvents, defineDomainListProps } from '../../core/render';
import { useAPIClient } from '../../core';

export const UserList = defineComponent({
    name: 'UserList',
    props: defineDomainListProps<User>(),
    slots: Object as SlotsType<DomainListSlotsType<User>>,
    emits: defineDomainListEvents<User>(),
    setup(props, ctx) {
        const { build } = createDomainListBuilder<User>({
            props,
            setup: ctx,
            load: (buildInput) => useAPIClient().user.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Users',
                    icon: 'fa-solid fa-user',
                },

                noMore: {
                    content: 'No more users available...',
                },
            },
        });

        return () => build();
    },
});

export default UserList;
