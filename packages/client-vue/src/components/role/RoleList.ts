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
import { createDomainListBuilder } from '../../composables';
import { useAPIClient } from '../../utils';

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
        withHeader: {
            type: Boolean,
            default: true,
        },
        withNoMore: {
            type: Boolean,
            default: true,
        },
        withPagination: {
            type: Boolean,
            default: true,
        },
        withSearch: {
            type: Boolean,
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
            components: {
                /*
                header: {
                    title: {
                        iconClass: 'fa-solid fa-user-group',
                        textContent: 'Roles',
                    },
                },
                 */
                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-user-group',
                    },
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
