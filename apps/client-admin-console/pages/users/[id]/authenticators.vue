<script lang="ts">
import type { User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { AUserAuthenticators } from '@authup/client-web-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';
import { definePageMeta, useErrorToast } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    components: { AUserAuthenticators },
    props: {
        entity: {
            type: Object as PropType<User>,
            required: true,
        },
    },
    setup(props) {
        definePageMeta({ [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.USER_AUTHENTICATOR_READ] });

        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        return {
            userId: props.entity.id,
            handleFailed,
        };
    },
});
</script>
<template>
    <div>
        <AUserAuthenticators
            :user-id="userId"
            @failed="handleFailed"
        />
    </div>
</template>
