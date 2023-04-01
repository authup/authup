/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/common';
import { Robot } from '@authup/common';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta, resolveComponent } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    props: {
        entity: {
            type: Object as PropType<Client>,
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
        });

        const handleUpdated = (e: Client) => {
            emit('updated', e);
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const form = resolveComponent('ClientForm');

        return () => h('div', { class: 'row' }, [
            h('h6', { class: 'title' }, ['General']),
            h(form, {
                entity: props.entity,
                realmId: props.entity.realm_id,
                onUpdated: handleUpdated,
                onFailed: handleFailed,
            }),
        ]);
    },
});
