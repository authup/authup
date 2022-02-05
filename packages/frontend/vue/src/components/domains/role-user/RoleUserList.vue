<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script>
import UserRoleListItemActions from '../user-role/UserRoleListItemActions';
import UserList from '../user/UserList';

export default {
    components: { UserList, UserRoleListItemActions },
    props: {
        roleId: String,
    },
    data() {
        return {

        };
    },
};
</script>
<template>
    <div>
        <user-list
            ref="roleList"
        >
            <template #item-actions="props">
                <user-role-list-item-actions
                    :role-id="roleId"
                    :user-id="props.item.id"
                />
            </template>
        </user-list>
    </div>
</template>
