/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { BuildInput } from 'rapiq';
import type { ClientScope } from '@authup/core';
import { useListBuilder } from '../../composables';
import { useHTTPClient } from '../../utils';

export const ClientScopeList = defineComponent({
    name: 'ClientScopeList',
    props: {
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<ClientScope>>,
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
        deleted: (item: ClientScope) => true,
        updated: (item: ClientScope) => true,
    },
    setup(props, ctx) {
        const { build } = useListBuilder<ClientScope>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useHTTPClient().clientScope.getMany(buildInput),
            components: {
                header: {
                    title: {
                        iconClass: 'fa-solid fa-meteor',
                        textContent: 'ClientScopes',
                    },
                },
                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-meteor',
                    },
                },
                noMore: {
                    textContent: 'No more client-scopes available...',
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

export default ClientScopeList;
