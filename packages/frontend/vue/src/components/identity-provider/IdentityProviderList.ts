/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PropType, defineComponent, toRef, toRefs,
} from 'vue';
import { BuildInput } from 'rapiq';
import { IdentityProvider } from '@authelion/common';
import { useListBuilder } from '../../composables';
import {
    useHTTPClient,
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
    setup(props) {
        const { build } = useListBuilder<IdentityProvider>({
            props: toRefs(props),
            load: (buildInput) => useHTTPClient().identityProvider.getMany(buildInput),
            components: {
                header: {
                    title: {
                        iconClass: 'fa-solid fa-atom',
                        textContent: 'Providers',
                    },
                },
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
