<script lang="ts">
import { APermissionForm } from '@authup/client-web-kit';
import type { Permission } from '@authup/core-kit';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
    components: { APermissionForm },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        const router = useRouter();

        const handleCreated = (e: Permission) => {
            router.push({ path: `/permissions/${e.id}` });
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return {
            handleCreated,
            handleFailed,
        };
    },
});
</script>
<template>
    <APermissionForm
        @failed="handleFailed"
        @created="handleCreated"
    />
</template>
