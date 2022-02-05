<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import RoleList from '../role/RoleList';
import UserRoleListItemActions from './UserRoleListItemActions';

export default {
    components: {
        UserRoleListItemActions,
        RoleList,
    },
    props: {
        userId: String,
    },
    data() {
        return {

        };
    },
    methods: {

    },
};
</script>
<template>
    <div>
        <role-list
            ref="itemList"
        >
            <template #item-actions="props">
                <user-role-list-item-actions
                    :role-id="props.item.id"
                    :user-id="userId"
                />
            </template>
        </role-list>
    </div>
</template>
