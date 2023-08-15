/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { ClientScope } from '@authup/core';
import type { EntityListSlotsType } from '../../core';
import { createEntityList, defineDomainListEvents, defineDomainListProps } from '../../core';

export const ClientScopeList = defineComponent({
    name: 'ClientScopeList',
    props: defineDomainListProps<ClientScope>(),
    slots: Object as SlotsType<EntityListSlotsType<ClientScope>>,
    emits: defineDomainListEvents<ClientScope>(),
    setup(props, ctx) {
        const { render, setDefaults } = createEntityList({
            type: `${DomainType.CLIENT_SCOPE}`,
            props,
            setup: ctx,
        });

        setDefaults({
            footerPagination: true,

            headerSearch: true,
            headerTitle: {
                content: 'ClientScopes',
                icon: 'fa-solid fa-meteor',
            },

            noMore: {
                content: 'No more client-scopes available...',
            },
        });

        return () => render();
    },
});

export default ClientScopeList;
