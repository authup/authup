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
import { createList, defineListEvents, defineListProps } from '../../core';

export const AScopes = defineComponent({
    props: defineListProps<Scope>(),
    slots: Object as SlotsType<ListSlotsType<Scope>>,
    emits: defineListEvents<Scope>(),
    setup(props, ctx) {
        const { render, setDefaults } = createList({
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

export default AScopes;
