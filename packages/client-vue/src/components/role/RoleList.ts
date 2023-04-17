/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { BuildInput } from 'rapiq';
import type { Role } from '@authup/core';
import type { DomainListHeaderSearchOptionsInput, DomainListHeaderTitleOptionsInput } from '../../helpers';
import { createDomainListBuilder } from '../../helpers';
import { useAPIClient } from '../../core';

export const RoleList = defineComponent({
    name: 'RoleList',
    props: {
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<Role>>,
            default() {
                return {};
            },
        },
        noMore: {
            type: Boolean,
            default: true,
        },
        footerPagination: {
            type: Boolean,
            default: true,
        },
        headerTitle: {
            type: [Boolean, Object] as PropType<boolean | DomainListHeaderTitleOptionsInput>,
            default: true,
        },
        headerSearch: {
            type: [Boolean, Object] as PropType<boolean | DomainListHeaderSearchOptionsInput>,
            default: true,
        },
    },
    emits: {
        deleted: (item: Role) => true,
        updated: (item: Role) => true,
    },
    setup(props, ctx) {
        const { build } = createDomainListBuilder<Role>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useAPIClient().role.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Roles',
                    icon: 'fa-solid fa-user-group',
                },

                noMore: {
                    textContent: 'No more roles available...',
                },
            },
        });

        return () => build();
    },
});

export default RoleList;
