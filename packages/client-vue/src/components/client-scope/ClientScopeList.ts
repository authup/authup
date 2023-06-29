/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { ClientScope } from '@authup/core';
import type { DomainListSlotsType } from '../../core/render';
import { createDomainListBuilder, defineDomainListEvents, defineDomainListProps } from '../../core/render';
import { useAPIClient } from '../../core';

export const ClientScopeList = defineComponent({
    name: 'ClientScopeList',
    props: defineDomainListProps<ClientScope>(),
    slots: Object as SlotsType<DomainListSlotsType<ClientScope>>,
    emits: defineDomainListEvents<ClientScope>(),
    setup(props, ctx) {
        const { build } = createDomainListBuilder<ClientScope>({
            props,
            setup: ctx,
            load: (buildInput) => useAPIClient().clientScope.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'ClientScopes',
                    icon: 'fa-solid fa-meteor',
                },

                noMore: {
                    content: 'No more client-scopes available...',
                },
            },
        });

        return () => build();
    },
});

export default ClientScopeList;
