<script lang="ts">
import { AAuthorize } from '@authup/client-web-kit';
import { defineComponent } from 'vue';
import { definePageMeta } from '#imports';
import {
    useRoute,
} from '#app';

export default defineComponent({
    components: {
        AAuthorize,
    },
    async setup() {
        definePageMeta({
            layout: false,
        });

        const route = useRoute();

        return {
            route,
        };
    },
});
</script>
<template>
    <AAuthorize :query="route.query" />
</template>
