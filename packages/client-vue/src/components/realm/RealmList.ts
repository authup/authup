/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent, toRefs } from 'vue';
import type { Realm } from '@authup/core';
import type { BuildInput } from 'rapiq';
import type { DomainListHeaderSearchOptionsInput, DomainListHeaderTitleOptionsInput } from '../../helpers';
import { createDomainListBuilder } from '../../helpers';
import { useAPIClient } from '../../core';

export const RealmList = defineComponent({
    name: 'RealmList',
    props: {
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<Realm>>,
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
        deleted: (item: Realm) => true,
        updated: (item: Realm) => true,
    },
    setup(props, ctx) {
        const { build } = createDomainListBuilder<Realm>({
            props: toRefs(props),
            setup: ctx,
            load: (buildInput) => useAPIClient().realm.getMany(buildInput),
            defaults: {
                footerPagination: true,

                headerSearch: true,
                headerTitle: {
                    content: 'Realms',
                    icon: 'fa-solid fa-city',
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
