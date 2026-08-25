<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
    setup() {
        const router = useRouter();

        // The routing guard exchanges the authorization code (bearer mode)
        // and, when the callback URI carried a `redirect` destination, sends
        // the user there. Reaching this component means it did not, so there
        // is nowhere better to go than the start page.
        onMounted(() => {
            router.replace({ path: '/' });
        });
    },
});
</script>
<template>
    <div class="mx-auto w-full max-w-screen-lg px-4 text-center">
        <span class="fa-solid fa-spinner fa-spin" />
    </div>
</template>
