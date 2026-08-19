<script lang="ts">
import { defineNuxtComponent, navigateTo } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            layout: 'auth',
        });

        // The global routing interceptor exchanges the authorization code and,
        // when the callback URI carried a `redirect` destination, sends the
        // user there. Reaching this component means it did not, so there is
        // nowhere better to go than the start page.
        await navigateTo({ path: '/' });
    },
});
</script>
<template>
    <div class="mx-auto w-full max-w-screen-lg px-4 text-center">
        <span class="fa-solid fa-spinner fa-spin" />
    </div>
</template>
