/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/common';
import type { PropType } from 'vue';
import {
    defineNuxtComponent, definePageMeta, resolveComponent,
} from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    props: {
        entity: {
            type: Object as PropType<User>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    async setup(props, { emit }) {
        // todo: remove this when nuxt is fixed
        if (!props.entity) {
            return () => h('div', []);
        }

        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const handleUpdated = (e) => {
            emit('updated', e);
        };

        const handleFailed = (e) => {
            emit('failed', e);
        };

        const form = resolveComponent('UserForm');
        const passwordForm = resolveComponent('UserPasswordForm');

        return () => h('div', { class: 'row' }, [
            h('div', { class: 'col-7' }, [
                h('h6', { class: 'title' }, ['General']),
                h(form, {
                    entity: props.entity,
                    realmId: props.entity.realm_id,
                    onUpdated: handleUpdated,
                    onFailed: handleFailed,
                }),
            ]),
            h('div', { class: 'col-5' }, [
                h('h6', { class: 'title' }, ['Password']),
                h(passwordForm, {
                    id: props.entity.id,
                    onUpdated: handleUpdated,
                    onFailed: handleFailed,
                }),
            ]),

        ]);
    },
});
