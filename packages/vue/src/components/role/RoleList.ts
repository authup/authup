/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PropType, defineComponent, toRefs,
} from 'vue';
import { BuildInput } from 'rapiq';
import { Role } from '@authup/common';
import { useListBuilder } from '../../composables';
import { useHTTPClient } from '../../utils';

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
        const { build } = useListBuilder<Role>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useHTTPClient().role.getMany(buildInput),
            components: {
                header: {
                    title: {
                        iconClass: 'fa-solid fa-user-group',
                        textContent: 'Roles',
                    },
                },
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
