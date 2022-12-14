/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, Robot, Scope } from '@authup/common';
import { AuthEntityDelete } from '@authup/vue';
import { ListItemSlotProps, SlotName } from '@vue-layout/hyperscript';
import { NuxtLink } from '#components';
import { resolveComponent } from '#imports';

export default defineComponent({
    emits: ['deleted'],
    setup(props, { emit }) {
        const list = resolveComponent('ScopeList');

        const handleDeleted = (e: Client) => {
            emit('deleted', e);
        };

        return () => h(list as string, {
            onDeleted: handleDeleted,
        }, {
            [SlotName.HEADER]: () => h('h6', [
                h('i', { class: 'fa-solid fa-list pe-1' }),
                'Overview',
            ]),
            [SlotName.ITEM_ACTIONS]: (props: ListItemSlotProps<Scope>) => h('div', [
                h(NuxtLink, { class: 'btn btn-xs btn-outline-primary me-1', to: `/admin/scopes/${props.data.id}` }, {
                    default: () => h('i', { class: 'fa fa-bars' }),
                }),
                h(AuthEntityDelete, {
                    class: 'btn btn-xs btn-outline-danger',
                    entityId: props.data.id,
                    entityType: 'scope',
                    withText: false,
                    onDeleted: props.deleted,
                    disabled: props.data.built_in,
                }),
            ]),
        });
    },
});
