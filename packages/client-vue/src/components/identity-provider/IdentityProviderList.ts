/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { IdentityProvider } from '@authup/core';
import type { EntityListSlotsType } from '../../core';
import { createEntityList, defineDomainListEvents, defineDomainListProps } from '../../core';

export const IdentityProviderList = defineComponent({
    props: defineDomainListProps<IdentityProvider>(),
    slots: Object as SlotsType<EntityListSlotsType<IdentityProvider>>,
    emits: defineDomainListEvents<IdentityProvider>(),
    setup(props, ctx) {
        const { render, setDefaults } = createEntityList({
            type: `${DomainType.IDENTITY_PROVIDER}`,
            props,
            setup: ctx,
        });

        setDefaults({
            footerPagination: true,

            headerSearch: true,
            headerTitle: {
                content: 'Providers',
                icon: 'fa-solid fa-atom',
            },
            noMore: {
                content: 'No more identity-providers available...',
            },
        });

        return () => render();
    },
});

export default IdentityProviderList;
