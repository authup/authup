<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import Vue from 'vue';
import ProviderRoleListItem from './OAuth2ProviderRoleListItem';
import RoleList from '../role/RoleList';

export default {
    name: 'OAuth2ProviderRoleList',
    components: {
        RoleList, ProviderRoleListItem,
    },
    props: {
        providerId: String,
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
            assignedOnly: false,
            query: {},
        };
    },
    methods: {
        handleAdded(item) {
            const index = this.items.findIndex((userRole) => userRole.id === item.id);
            if (index === -1) {
                this.items.push(item);
            }
        },
        handleUpdated(item) {
            const index = this.items.findIndex((el) => el.id === item.id);
            if (index !== -1) {
                const keys = Object.keys(item);
                for (let i = 0; i < keys.length; i++) {
                    Vue.set(this.items[index], keys[i], item[keys[i]]);
                }
            }
        },
        handleDropped(item) {
            const index = this.items.findIndex((el) => el.id === item.id);
            if (index !== -1) {
                this.items.splice(index, 1);
            }
        },
    },
};
</script>
<template>
    <div>
        <role-list
            ref="roleList"
            :query="query"
            :with-header="false"
        >
            <template #header-title>
                <span />
            </template>
            <template #items="props">
                <template v-for="role in props.items">
                    <provider-role-list-item
                        :key="role.id"
                        :provider-id="providerId"
                        :role="role"
                        @created="handleAdded"
                        @updated="handleUpdated"
                        @deleted="handleDropped"
                    />
                </template>
            </template>
        </role-list>
    </div>
</template>
