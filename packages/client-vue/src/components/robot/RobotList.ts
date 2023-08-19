/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Robot } from '@authup/core';
import type { ListSlotsType } from '../../core';
import { createEntityList, defineDomainListEvents, defineDomainListProps } from '../../core';

export const RobotList = defineComponent({
    props: defineDomainListProps<Robot>(),
    slots: Object as SlotsType<ListSlotsType<Robot>>,
    emits: defineDomainListEvents<Robot>(),
    setup(props, ctx) {
        const { render, setDefaults } = createEntityList({
            type: `${DomainType.ROBOT}`,
            props,
            setup: ctx,
        });

        setDefaults({
            noMore: {
                content: 'No more robots available...',
            },
        });

        return () => render();
    },
});
