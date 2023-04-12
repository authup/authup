/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Permission } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import { SlotName } from '@vue-layout/list-controls';
import { storeToRefs } from 'pinia';
import { NuxtLink } from '#components';
import { resolveComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineComponent({
    emits: ['deleted'],
    setup(props, { emit }) {
        const store = useAuthStore();
        const { realmManagement, realmManagementId } = storeToRefs(store);

        const list = resolveComponent('PermissionList');

        const handleDeleted = (e: Client) => {
            emit('deleted', e);
        };

        return () => h(list as string, {
            onDeleted: handleDeleted,
            query: {
                filter: {
                    realm_id: [realmManagementId.value, null],
                },
            },
        }, {
            [SlotName.HEADER]: () => h('h6', [
                h('i', { class: 'fa-solid fa-list pe-1' }),
                'Overview',
            ]),
            [SlotName.ITEM_ACTIONS]: (props: { data: Permission }) => h('div', [
                h(NuxtLink, {
                    class: 'btn btn-xs btn-outline-primary me-1',
                    to: `/admin/permissions/${props.data.id}`,
                    disabled: !store.has(PermissionName.PERMISSION_EDIT) ||
                        !isRealmResourceWritable(realmManagement.value, props.data.realm_id),
                }, {
                    default: () => h('i', { class: 'fa fa-bars' }),
                }),
            ]),
        });
    },
});
