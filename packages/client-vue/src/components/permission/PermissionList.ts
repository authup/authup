/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Permission } from '@authup/core';
import type { EntityListSlotsType } from '../../core/entity-list';
import { createEntityList, defineDomainListEvents, defineDomainListProps } from '../../core/entity-list';
import { useAPIClient } from '../../core';

export const PermissionList = defineComponent({
    name: 'PermissionList',
    props: defineDomainListProps<Permission>(),
    slots: Object as SlotsType<EntityListSlotsType<Permission>>,
    emits: defineDomainListEvents<Permission>(),
    setup(props, setup) {
        const { render } = createEntityList<Permission>({
            props,
            setup,
            load: (buildInput) => useAPIClient().permission.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Permissions',
                    icon: 'fa-solid fa-key',
                },

                noMore: {
                    content: 'No more permissions available...',
                },
            },
        });

        return () => render();
    },
});
