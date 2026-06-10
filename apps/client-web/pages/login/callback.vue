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
        // when an in-app target was stored, redirects there. Reaching this
        // component means the exchange succeeded without a stored target.
        await navigateTo({ path: '/' });
    },
});
</script>
<template>
    <div class="container text-center">
        <span class="fa-solid fa-spinner fa-spin" />
    </div>
</template>
