/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { BuildInput } from 'rapiq';
import type { Robot } from '@authup/core';
import type { DomainListHeaderSearchOptionsInput, DomainListHeaderTitleOptionsInput } from '../../helpers';
import { createDomainListBuilder } from '../../helpers';
import { useAPIClient } from '../../core';

export const RobotList = defineComponent({
    name: 'RobotList',
    props: {
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<Robot>>,
            default() {
                return {};
            },
        },
        noMore: {
            type: Boolean,
            default: true,
        },
        footerPagination: {
            type: Boolean,
            default: true,
        },
        headerTitle: {
            type: [Boolean, Object] as PropType<boolean | DomainListHeaderTitleOptionsInput>,
            default: true,
        },
        headerSearch: {
            type: [Boolean, Object] as PropType<boolean | DomainListHeaderSearchOptionsInput>,
            default: true,
        },
    },
    emits: {
        deleted: (item: Robot) => true,
        updated: (item: Robot) => true,
    },
    setup(props, ctx) {
        const { build } = createDomainListBuilder<Robot>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useAPIClient().robot.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Robots',
                    icon: 'fa fa-solid fa-robot',
                },

                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-robot',
                    },
                },
                noMore: {
                    textContent: 'No more robots available...',
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
