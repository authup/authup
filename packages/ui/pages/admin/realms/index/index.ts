/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/common';
import { PermissionName, isRealmResourceWritable } from '@authup/common';
import { AuthEntityDelete } from '@authup/vue';
import type { ListItemSlotProps } from '@vue-layout/hyperscript';
import { SlotName } from '@vue-layout/hyperscript';
import { storeToRefs } from 'pinia';
import type { VNodeChild } from 'vue';
import { NuxtLink } from '#components';
import { resolveComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineComponent({
    emits: ['deleted'],
    setup(props, { emit }) {
        const list = resolveComponent('RealmList');

        const store = useAuthStore();
        const { realmManagement, realmManagementId } = storeToRefs(store);

        const handleDeleted = (e: Realm) => {
            emit('deleted', e);
        };

        return () => h(list as string, {
            onDeleted: handleDeleted,
        }, {
            [SlotName.HEADER]: () => h('h6', [
                h('i', { class: 'fa-solid fa-list pe-1' }),
                'Overview',
            ]),
            [SlotName.ITEM_ACTIONS]: (props: ListItemSlotProps<Realm>) => {
                const buttons : VNodeChild = [];

                if (
                    realmManagementId.value !== props.data.id &&
                    isRealmResourceWritable(realmManagement.value)
                ) {
                    buttons.push(h(
                        'button',
                        {
                            class: 'btn btn-xs btn-primary me-1',
                            onClick($event: any) {
                                $event.preventDefault();

                                store.setRealmManagement(props.data);
                            },
                        },
                        [
                            h('i', { class: 'fa-solid fa-check' }),
                        ],
                    ));
                }

                if (isRealmResourceWritable(realmManagement.value, props.data.id)) {
                    buttons.push(
                        h(
                            NuxtLink,
                            {
                                class: 'btn btn-xs btn-outline-primary me-1',
                                to: `/admin/realms/${props.data.id}`,
                                disabled: !store.has(PermissionName.REALM_EDIT),
                            },
                            {
                                default: () => h('i', { class: 'fa fa-bars' }),
                            },
                        ),
                        h(AuthEntityDelete, {
                            class: 'btn btn-xs btn-outline-danger',
                            entityId: props.data.id,
                            entityType: 'realm',
                            withText: false,
                            onDeleted: props.deleted,
                            disabled: !store.has(PermissionName.REALM_DROP) ||
                                !props.data.drop_able,
                        }),
                    );
                }

                return h('div', buttons);
            },
        });
    },
});
