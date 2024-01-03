<script lang="ts">

import { AScopeForm } from '@authup/client-vue';
import type { Scope } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta, resolveComponent } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    components: {
        AScopeForm,
    },
    props: {
        entity: {
            type: Object as PropType<Scope>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const handleUpdated = (e: Scope) => {
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
        <AScopeForm
            :entity="entity"
            :realm-id="entity.realm_id"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>
