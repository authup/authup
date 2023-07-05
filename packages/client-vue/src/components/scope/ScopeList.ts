/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Scope } from '@authup/core';
import type { EntityListSlotsType } from '../../core/entity-list';
import { createEntityList, defineDomainListEvents, defineDomainListProps } from '../../core/entity-list';
import { useAPIClient } from '../../core';

export const ScopeList = defineComponent({
    name: 'ScopeList',
    props: defineDomainListProps<Scope>(),
    slots: Object as SlotsType<EntityListSlotsType<Scope>>,
    emits: defineDomainListEvents<Scope>(),
    setup(props, ctx) {
        const { render } = createEntityList<Scope>({
            props,
            setup: ctx,
            load: (buildInput) => useAPIClient().scope.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Scopes',
                    icon: 'fa-solid fa-meteor',
                },

                noMore: {
                    content: 'No more scopes available...',
                },
            },
        });

        return () => render();
    },
});

export default ScopeList;
