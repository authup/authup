/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { BuildInput } from 'rapiq';
import type { User } from '@authup/core';
import type { DomainListHeaderSearchOptionsInput, DomainListHeaderTitleOptionsInput } from '../../composables';
import { createDomainListBuilder } from '../../composables';
import { useAPIClient } from '../../utils';

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
        deleted: (item: User) => true,
        updated: (item: User) => true,
    },
    setup(props, ctx) {
        const propsRef = toRefs(props);

        const { build } = createDomainListBuilder<User>({
            props: propsRef,
            setup: ctx,
            load: (buildInput) => useAPIClient().user.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Users',
                    icon: 'fa-solid fa-user',
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
