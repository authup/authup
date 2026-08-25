<script lang="ts">

import { ARealmForm } from '@authup/client-web-kit';
import type { Realm } from '@authup/core-kit';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
    components: { ARealmForm },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        const router = useRouter();

        const handleCreated = (e: Realm) => {
            router.push({ path: `/realms/${e.id}` });
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
    <ARealmForm
        @created="handleCreated"
        @failed="handleFailed"
    />
</template>
