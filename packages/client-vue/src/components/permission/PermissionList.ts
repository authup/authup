/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Permission } from '@authup/core';
import type { DomainListSlotsType } from '../../core/render';
import { createDomainListBuilder, defineDomainListEvents, defineDomainListProps } from '../../core/render';
import { useAPIClient } from '../../core';

export const PermissionList = defineComponent({
    name: 'PermissionList',
    props: defineDomainListProps<Permission>(),
    slots: Object as SlotsType<DomainListSlotsType<Permission>>,
    emits: defineDomainListEvents<Permission>(),
    setup(props, ctx) {
        const { build } = createDomainListBuilder<Permission>({
            props,
            setup: ctx,
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

        return () => build();
    },
});
