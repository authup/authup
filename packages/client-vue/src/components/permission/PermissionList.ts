/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { Permission } from '@authup/core';
import type { BuildInput } from 'rapiq';
import type { DomainListHeaderSearchOptionsInput, DomainListHeaderTitleOptionsInput } from '../../composables';
import { createDomainListBuilder } from '../../composables';
import { useAPIClient } from '../../utils';

export const PermissionList = defineComponent({
    name: 'PermissionList',
    props: {
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<Permission>>,
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
        deleted: (item: Permission) => true,
        updated: (item: Permission) => true,
    },
    setup(props, ctx) {
        const { build } = createDomainListBuilder<Permission>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useAPIClient().permission.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Permissions',
                    icon: 'fa-solid fa-key',
                },

                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-key',
                        textPropName: 'name',
                    },
                },
                noMore: {
                    textContent: 'No more permissions available...',
                },
            },
        });

        return () => build();
    },
});
