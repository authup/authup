/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { BuildInput } from 'rapiq';
import type { Client } from '@authup/common';
import { useListBuilder } from '../../composables';
import { useHTTPClient } from '../../utils';

export const ClientList = defineComponent({
    name: 'ClientList',
    props: {
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<Client>>,
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
        deleted: (item: Client) => true,
        updated: (item: Client) => true,
    },
    setup(props, ctx) {
        const { build } = useListBuilder<Client>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useHTTPClient().client.getMany(buildInput),
            components: {
                header: {
                    title: {
                        iconClass: 'fa-solid fa-robot',
                        textContent: 'Clients',
                    },
                },
                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-ghost',
                    },
                },
                noMore: {
                    textContent: 'No more clients available...',
                },
            },
        });

        return () => build();
    },
    data() {
        return {
            busy: false,
            items: [],
            q: '',
            meta: {
                limit: 10,
                offset: 0,
                total: 0,
            },
            itemBusy: false,
        };
    },
});

export default ClientList;
