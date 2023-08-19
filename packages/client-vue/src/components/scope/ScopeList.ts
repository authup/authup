/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Scope } from '@authup/core';
import type { ListSlotsType } from '../../core';
import { createEntityList, defineDomainListEvents, defineDomainListProps } from '../../core';

export const ScopeList = defineComponent({
    props: defineDomainListProps<Scope>(),
    slots: Object as SlotsType<ListSlotsType<Scope>>,
    emits: defineDomainListEvents<Scope>(),
    setup(props, ctx) {
        const { render, setDefaults } = createEntityList({
            type: DomainType.SCOPE,
            props,
            setup: ctx,
        });

        setDefaults({
            noMore: {
                content: 'No more scopes available...',
            },
        });

        return () => render();
    },
});

export default ScopeList;
