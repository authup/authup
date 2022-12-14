/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName, Realm } from '@authup/common';
import { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta, resolveComponent } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        // todo: remove this when nuxt is fixed
        if (!props.entity) {
            return () => h('div', []);
        }

        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.REALM_EDIT,
            ],
        });

        const handleUpdated = (e) => {
            emit('updated', e);
        };

        const handleFailed = (e) => {
            emit('failed', e);
        };

        const form = resolveComponent('RealmForm');

        return () => h('div', { class: 'row' }, [
            h('h6', { class: 'title' }, ['General']),
            h(form, {
                entity: props.entity,
                onUpdated: handleUpdated,
                onFailed: handleFailed,
            }),
        ]);
    },
});
