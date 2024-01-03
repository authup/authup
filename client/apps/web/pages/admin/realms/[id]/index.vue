<script lang="ts">
import { ARealmForm } from '@authup/client-vue';
import type { Realm } from '@authup/core';
import { PermissionName } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    components: {
        RealmForm: ARealmForm,
    },
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.REALM_EDIT,
            ],
        });

        const handleUpdated = (e: Realm) => {
            emit('updated', e);
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return {
            entity: props.entity,
            handleUpdated,
            handleFailed,
        };
    },
});
</script>
<template>
    <div>
        <h6 class="title">
            General
        </h6>
        <RealmForm
            :entity="entity"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>
