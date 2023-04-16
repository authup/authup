<script lang="ts">
import type { User } from '@authup/core';
import {
    DomainType, PermissionName, isRealmResourceWritable,
} from '@authup/core';
import { AuthEntityDelete } from '@authup/client-vue';
import type { ListItemSlotProps } from '@vue-layout/list-controls';
import { SlotName } from '@vue-layout/list-controls';
import { storeToRefs } from 'pinia';
import { defineNuxtComponent } from '#app';
import { NuxtLink } from '#components';
import { resolveComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    emits: ['deleted'],
    setup(props, { emit }) {
        const list = resolveComponent('UserList');

        const handleDeleted = (e: User) => {
            emit('deleted', e);
        };

        const store = useAuthStore();
        const { realmManagement, realmManagementId } = storeToRefs(store);

        return () => h(list as string, {
            onDeleted: handleDeleted,
            query: {
                filter: {
                    realm_id: realmManagementId.value,
                },
            },
        }, {
            [SlotName.HEADER]: () => h('h6', [
                h('i', { class: 'fa-solid fa-list pe-1' }),
                'Overview',
            ]),
            [SlotName.ITEM_ACTIONS]: (props: ListItemSlotProps<User>) => h('div', [
                h(NuxtLink, {
                    class: 'btn btn-xs btn-outline-primary me-1',
                    to: `/admin/users/${props.data.id}`,
                    disabled: !store.has(PermissionName.USER_EDIT) ||
                        !isRealmResourceWritable(realmManagement.value, props.data.realm_id),
                }, {
                    default: () => h('i', { class: 'fa fa-bars' }),
                }),
                h(AuthEntityDelete, {
                    class: 'btn btn-xs btn-outline-danger',
                    entityId: props.data.id,
                    entityType: DomainType.USER,
                    withText: false,
                    onDeleted: props.deleted,
                    disabled: !store.has(PermissionName.USER_DROP) ||
                        !isRealmResourceWritable(realmManagement.value, props.data.realm_id),
                }),
            ]),
        });
    },
});
</script>
