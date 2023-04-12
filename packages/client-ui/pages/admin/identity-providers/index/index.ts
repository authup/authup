/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core';
import { DomainType, PermissionName, isRealmResourceWritable } from '@authup/core';
import { AuthEntityDelete } from '@authup/client-vue';
import type { ListItemSlotProps } from '@vue-layout/list-controls';
import { SlotName } from '@vue-layout/list-controls';
import { storeToRefs } from 'pinia';
import { NuxtLink } from '#components';
import { resolveComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineComponent({
    emits: ['deleted'],
    setup(props, { emit }) {
        const list = resolveComponent('IdentityProviderList');

        const handleDeleted = (e: IdentityProvider) => {
            emit('deleted', e);
        };

        const store = useAuthStore();
        const { realmManagement, realmManagementId } = storeToRefs(store);

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
            [SlotName.ITEM_ACTIONS]: (props: ListItemSlotProps<IdentityProvider>) => h('div', [
                h(
                    NuxtLink,
                    {
                        class: 'btn btn-xs btn-outline-primary me-1',
                        to: `/admin/identity-providers/${props.data.id}`,
                        disabled: !store.has(PermissionName.PROVIDER_EDIT) ||
                            !isRealmResourceWritable(realmManagement.value, props.data.realm_id),
                    },
                    {
                        default: () => h('i', { class: 'fa fa-bars' }),
                    },
                ),
                h(AuthEntityDelete, {
                    class: 'btn btn-xs btn-outline-danger',
                    entityId: props.data.id,
                    entityType: DomainType.IDENTITY_PROVIDER,
                    withText: false,
                    onDeleted: props.deleted,
                    disabled: !store.has(PermissionName.PROVIDER_DROP) ||
                        !isRealmResourceWritable(realmManagement.value, props.data.realm_id),
                }),
            ]),
        });
    },
});
