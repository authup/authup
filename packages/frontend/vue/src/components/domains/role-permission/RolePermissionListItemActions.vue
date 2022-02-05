<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<template>
    <div>
        <button
            v-if="!isAssigned"
            class="btn btn-xs btn-success"
            @click.prevent="add"
        >
            <i class="fa fa-plus" />
        </button>
        <button
            v-if="isAssigned"
            class="btn btn-xs btn-danger"
            @click.prevent="drop"
        >
            <i class="fa fa-trash" />
        </button>
    </div>
</template>
<script>
export default {
    props: {
        rolePermissions: {
            type: Array,
            default() {
                return [];
            },
        },
        primaryParameter: {
            type: String,
            default: 'permission',
        },
        roleId: Number,
        permissionId: String,
    },
    data() {
        return {
            busy: false,
        };
    },
    computed: {
        rolePermissionIndex() {
            return this.rolePermissions.findIndex((rolePermission) => (this.primaryParameter === 'permission' ?
                rolePermission.permission_id === this.permissionId :
                rolePermission.role_id === this.roleId));
        },
        isAssigned() {
            return this.rolePermissionIndex !== -1;
        },
    },
    methods: {
        async add() {
            if (this.busy) return;

            this.busy = true;

            try {
                const item = await this.$authApi.rolePermission.create({
                    role_id: this.roleId,
                    permission_id: this.permissionId,
                });

                this.$emit('added', item);
            } catch (e) {
                // ...
            }

            this.busy = false;
        },
        async drop() {
            if (this.busy || this.rolePermissionIndex === -1) return;

            this.busy = true;

            try {
                await this.$authApi.rolePermission.delete(this.rolePermissions[this.rolePermissionIndex].id);

                this.$emit('dropped', this.rolePermissions[this.rolePermissionIndex]);
            } catch (e) {
                // ...
            }

            this.busy = false;
        },
    },
};
</script>
