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
import { User } from '@authup/common';
import { useListBuilder } from '../../composables';
import { useHTTPClient } from '../../utils';

export const UserList = defineComponent({
    name: 'UserList',
    props: {
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<User>>,
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
        deleted: (item: User) => true,
        updated: (item: User) => true,
    },
    setup(props, ctx) {
        const { build } = useListBuilder<User>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useHTTPClient().user.getMany(buildInput),
            components: {
                header: {
                    title: {
                        iconClass: 'fa-solid fa-users',
                        textContent: 'Users',
                    },
                },
                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-user',
                    },
                },
                noMore: {
                    textContent: 'No more users available...',
                },
            },
        });

        return () => build();
    },
});

export default UserList;
