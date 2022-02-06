<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import RolePermissionListItemActions from './RolePermissionListItemActions.vue';
import PermissionList from '../permission/PermissionList.vue';

export default {
    name: 'RolePermissionList',
    components: { PermissionList, RolePermissionListItemActions },
    props: {
        roleId: String,
    },
};
</script>
<template>
    <div>
        <permission-list
            ref="roleList"
        >
            <template #item-actions="props">
                <role-permission-list-item-actions
                    :role-id="roleId"
                    :permission-id="props.item.id"
                />
            </template>
        </permission-list>
    </div>
</template>
