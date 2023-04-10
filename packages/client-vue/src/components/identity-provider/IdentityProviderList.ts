/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { BuildInput } from 'rapiq';
import type { IdentityProvider } from '@authup/core';
import { createDomainListBuilder } from '../../composables';
import {
    useAPIClient,
} from '../../utils';

export const IdentityProviderList = defineComponent({
    name: 'IdentityProviderList',
    props: {
        query: {
            type: Object as PropType<BuildInput<IdentityProvider>>,
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
    emits: {
        deleted: (item: IdentityProvider) => true,
        updated: (item: IdentityProvider) => true,
    },
    setup(props, ctx) {
        const { build } = createDomainListBuilder<IdentityProvider>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useAPIClient().identityProvider.getMany(buildInput),
            components: {
                /*
                header: {
                    title: {
                        iconClass: 'fa-solid fa-atom',
                        textContent: 'Providers',
                    },
                },
                 */
                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-atom',
                    },
                },
                noMore: {
                    textContent: 'No more identity-providers available...',
                },
            },
        });

        return () => build();
    },
});

export default IdentityProviderList;
