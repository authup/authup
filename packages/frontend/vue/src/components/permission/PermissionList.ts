/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    PropType, defineComponent, toRefs,
} from 'vue';
import { Permission } from '@authelion/common';
import { BuildInput } from 'rapiq';
import { useListBuilder } from '../../composables';
import { useHTTPClient } from '../../utils';

export const PermissionList = defineComponent({
    name: 'PermissionList',
    props: {
        query: {
            type: Object as PropType<BuildInput<Permission>>,
            default() {
                return {};
            },
        },
        withNoMore: {
            type: Boolean,
            default: true,
        },
        withHeader: {
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
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
    },
    setup(props, { slots }) {
        const { build } = useListBuilder<Permission>({
            props: toRefs(props),
            slots,
            load: (buildInput) => useHTTPClient().permission.getMany(buildInput),
            components: {
                header: {
                    title: {
                        iconClass: 'fa-solid fa-key',
                        textContent: 'Permissions',
                    },
                },
                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-key',
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
