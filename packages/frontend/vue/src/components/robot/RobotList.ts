/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PropType, defineComponent, toRefs,
} from 'vue';
import { BuildInput } from 'rapiq';
import { IdentityProvider, Robot } from '@authelion/common';
import { useListBuilder } from '../../composables';
import { useHTTPClient } from '../../utils';

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
        withHeader: {
            type: Boolean,
            default: true,
        },
        withNoMore: {
            type: Boolean,
            default: true,
        },
        withPagination: {
            type: Boolean,
            default: true,
        },
        withSearch: {
            type: Boolean,
            default: true,
        },
    },
    setup(props) {
        const { build } = useListBuilder<Robot>({
            props: toRefs(props),
            load: (buildInput) => useHTTPClient().robot.getMany(buildInput),
            components: {
                header: {
                    title: {
                        iconClass: 'fa-solid fa-robot',
                        textContent: 'Robots',
                    },
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
