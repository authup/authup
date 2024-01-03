<script lang="ts">

import { ARoleForm } from '@authup/client-vue';
import type { Role } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '../../../../config/layout';

export default defineNuxtComponent({
    components: {
        RoleForm: ARoleForm,
    },
    props: {
        entity: {
            type: Object as PropType<Role>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const handleUpdated = (e: Role) => {
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
        <RoleForm
            :entity="entity"
            @update="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>
