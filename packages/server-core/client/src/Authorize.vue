<!--
  - Copyright (c) 2025-2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthorize } from '@authup/client-web-kit';
import { defineComponent } from 'vue';
import { useRoute } from 'vue-router';

export default defineComponent({
    components: {
        AAuthorize,
    },
    setup() {
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
