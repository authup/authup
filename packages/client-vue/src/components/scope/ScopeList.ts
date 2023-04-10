/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { BuildInput } from 'rapiq';
import type { Scope } from '@authup/core';
import { createDomainListBuilder } from '../../composables';
import { useAPIClient } from '../../utils';

export const ScopeList = defineComponent({
    name: 'ScopeList',
    props: {
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<Scope>>,
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
        deleted: (item: Scope) => true,
        updated: (item: Scope) => true,
    },
    setup(props, ctx) {
        const { build } = createDomainListBuilder<Scope>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useAPIClient().scope.getMany(buildInput),
            components: {
                /*
                header: {

                  title: {
                      iconClass: 'fa-solid fa-meteor',
                      textContent: 'Scopes',
                  },
                },

                 */
                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-meteor',
                    },
                },
                noMore: {
                    textContent: 'No more scopes available...',
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

export default ScopeList;
