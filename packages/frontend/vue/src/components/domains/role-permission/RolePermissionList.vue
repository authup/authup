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
    data() {
        return {
            meta: {
                limit: 50,
                offset: 0,
                total: 0,
            },
            busy: false,
            items: [],
            assignedOnly: true,
            query: {},
        };
    },
    created() {
        this.load();
    },
    methods: {
        async load() {
            if (this.busy) return;

            this.busy = true;

            try {
                const response = await this.$authApi.rolePermission.getMany({
                    page: {
                        limit: this.meta.limit,
                        offset: this.meta.offset,
                    },
                    filter: {
                        role_id: this.roleId,
                    },
                });

                this.items = response.data;

                this.$nextTick(() => {
                    this.buildRequestFilter();
                });
            } catch (e) {
                // ...
            }

            this.busy = false;
        },

        buildRequestFilter(build = false) {
            const ids = this.items.map((item) => item.permission_id);
            let additionFilter;

            build = build ?? this.assignedOnly;

            if (build) {
                additionFilter = {
                    id: ids.join(','),
                };
            }

            this.query = {
                ...(additionFilter ? { filters: additionFilter } : {}),
            };

            this.$nextTick(() => {
                this.$refs.roleList.load();
            });
        },

        filterItems(item) {
            if (!this.assignedOnly) {
                return true;
            }

            return this.items.findIndex((rolePermission) => rolePermission.permission_id === item.id) !== -1;
        },

        handleAdded(item) {
            const index = this.items.findIndex((rolePermission) => rolePermission.id === item.id);
            if (index === -1) {
                this.items.push(item);
            }
        },
        handleDropped(item) {
            const index = this.items.findIndex((rolePermission) => rolePermission.id === item.id);
            if (index !== -1) {
                this.items.splice(index, 1);
            }
        },
    },
};
</script>
<template>
    <div>
        <permission-list
            ref="roleList"
            :query="query"
            :filter-items="filterItems"
            :load-on-init="false"
        >
            <template #header-title>
                <template v-if="assignedOnly">
                    Slight overview of all assigned permissions.
                </template>
                <template v-else>
                    Slight overview of all assigned and available permissions.
                </template>
            </template>
            <template #header-actions>
                <b-form-checkbox
                    v-model="assignedOnly"
                    :disabled="busy"
                    switch
                    @change="buildRequestFilter"
                >
                    Show only assigned roles
                </b-form-checkbox>
            </template>
            <template #item-actions="props">
                <role-permission-list-item-actions
                    :role-id="roleId"
                    :permission-id="props.item.id"
                    :role-permissions="items"
                    @added="handleAdded"
                    @dropped="handleDropped"
                />
            </template>
        </permission-list>
    </div>
</template>
