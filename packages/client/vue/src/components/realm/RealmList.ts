/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { Realm } from '@authup/common';
import type { BuildInput } from 'rapiq';
import { useListBuilder } from '../../composables';
import { useHTTPClient } from '../../utils';

export const RealmList = defineComponent({
    name: 'RealmList',
    props: {
        query: {
            type: Object as PropType<BuildInput<Realm>>,
            default() {
                return {};
            },
        },
        withNoMore: {
            type: Boolean,
            default: true,
        },
        withHeader: {
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
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
    },
    emits: {
        deleted: (item: Realm) => true,
        updated: (item: Realm) => true,
    },
    setup(props, ctx) {
        const { build } = useListBuilder<Realm>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useHTTPClient().realm.getMany(buildInput),
            components: {
                header: {
                    title: {
                        iconClass: 'fa-solid fa-city',
                        textContent: 'Realms',
                    },
                },
                items: {
                    item: {
                        iconClass: 'fa fa-solid fa-city',
                    },
                },
                noMore: {
                    textContent: 'No more realms available...',
                },
            },
        });

        return () => build();
    },
});
