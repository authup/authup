/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { IdentityProvider } from '@authup/core';
import type { EntityListSlotsType } from '../../core/entity-list';
import { createEntityList, defineDomainListEvents, defineDomainListProps } from '../../core/entity-list';
import {
    useAPIClient,
} from '../../core';

export const IdentityProviderList = defineComponent({
    name: 'IdentityProviderList',
    props: defineDomainListProps<IdentityProvider>(),
    slots: Object as SlotsType<EntityListSlotsType<IdentityProvider>>,
    emits: defineDomainListEvents<IdentityProvider>(),
    setup(props, ctx) {
        const { render } = createEntityList<IdentityProvider>({
            props,
            setup: ctx,
            load: (buildInput) => useAPIClient().identityProvider.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Providers',
                    icon: 'fa-solid fa-atom',
                },
                noMore: {
                    content: 'No more identity-providers available...',
                },
            },
        });

        return () => render();
    },
});

export default IdentityProviderList;
