/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { IdentityProvider } from '@authup/core-kit';
import type { ListSlotsType } from '../../core';
import { createList, defineListEvents, defineListProps } from '../../core';

export const AIdentityProviders = defineComponent({
    props: defineListProps<IdentityProvider>(),
    slots: Object as SlotsType<ListSlotsType<IdentityProvider>>,
    emits: defineListEvents<IdentityProvider>(),
    setup(props, ctx) {
        const { render, setDefaults } = createList({
            type: `${DomainType.IDENTITY_PROVIDER}`,
            props,
            setup: ctx,
        });

        setDefaults({
            noMore: {
                content: 'No more identity-providers available...',
            },
        });

        return () => render();
    },
});

export default AIdentityProviders;
