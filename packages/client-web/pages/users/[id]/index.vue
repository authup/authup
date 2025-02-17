<script lang="ts">

import { AUserForm, AUserPasswordForm } from '@authup/client-web-kit';
import type { User } from '@authup/core-kit';
import type { PropType } from 'vue';
import {
    defineNuxtComponent, definePageMeta,
} from '#imports';
import { LayoutKey } from '../../../config/layout';

export default defineNuxtComponent({
    components: {
        AUserForm,
        AUserPasswordForm,
    },
    props: {
        entity: {
            type: Object as PropType<User>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    async setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const handleUpdated = (e: User) => {
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
    <div class="row">
        <div class="col-7">
            <h6 class="title">
                General
            </h6>

            <AUserForm
                :entity="entity"
                :realm-id="entity.realm_id"
                @updated="handleUpdated"
                @failed="handleFailed"
            />
        </div>
        <div class="col-5">
            <h6 class="title">
                Password
            </h6>

            <AUserPasswordForm
                :id="entity.id"
                @updated="handleUpdated"
                @failed="handleFailed"
            />
        </div>
    </div>
</template>
