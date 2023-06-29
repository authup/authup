/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Robot } from '@authup/core';
import type { DomainListSlotsType } from '../../core/render';
import { createDomainListBuilder, defineDomainListEvents, defineDomainListProps } from '../../core/render';
import { useAPIClient } from '../../core';

export const RobotList = defineComponent({
    name: 'RobotList',
    props: defineDomainListProps<Robot>(),
    slots: Object as SlotsType<DomainListSlotsType<Robot>>,
    emits: defineDomainListEvents<Robot>(),
    setup(props, ctx) {
        const { build } = createDomainListBuilder<Robot>({
            props,
            setup: ctx,
            load: (buildInput) => useAPIClient().robot.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Robots',
                    icon: 'fa fa-solid fa-robot',
                },

                noMore: {
                    content: 'No more robots available...',
                },
            },
        });

        return () => build();
    },
    data() {
        return {
            busy: false,
            items: [],
            q: '',
            meta: {
                limit: 10,
                offset: 0,
                total: 0,
            },
            itemBusy: false,
        };
    },
});
