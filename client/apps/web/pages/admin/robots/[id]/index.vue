<script lang="ts">

import { RobotForm } from '@authup/client-vue';
import type { Robot } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    components: {
        RobotForm,
    },
    props: {
        entity: {
            type: Object as PropType<Robot>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const handleUpdated = (e: Robot) => {
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
        <RobotForm
            :entity="entity"
            :realm-id="entity.realm_id"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>
