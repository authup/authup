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
import type { DomainListHeaderSearchOptionsInput, DomainListHeaderTitleOptionsInput } from '../../composables';
import { createDomainListBuilder } from '../../composables';
import { useAPIClient } from '../../utils';

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
        deleted: (item: ClientScope) => true,
        updated: (item: ClientScope) => true,
    },
    setup(props, ctx) {
        const { build } = createDomainListBuilder<ClientScope>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useAPIClient().clientScope.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'ClientScopes',
                    icon: 'fa-solid fa-meteor',
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
