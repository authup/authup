<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import { defineComponent, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAccountConsoleURL } from '../../composables/account-console';

// Self-service moved to the account console, served by server-core on the
// IdP origin. This stub keeps the sidebar entry and old bookmarks working
// by mapping each retired settings path onto its account console route.
// A Map rather than an object literal: the key comes from the URL, and a
// plain record is read through Object.prototype, so `/settings/constructor`
// would resolve to a function instead of undefined and never reach the
// fallback below.
const PATH_MAP = new Map<string, string>([
    ['', '/'],
    ['password', '/password'],
    ['mfa', '/authenticators'],
    ['sessions', '/sessions'],
    ['applications', '/applications'],
]);

export default defineComponent({
    setup() {
        const route = useRoute();
        const segments = route.params.path;
        const key = Array.isArray(segments) ? segments.join('/') : (segments ?? '');

        // The account console is a separate application (a second SPA on
        // the IdP origin, or another origin under standalone hosting), so
        // this is a full navigation rather than a router push.
        const url = useAccountConsoleURL(PATH_MAP.get(key) ?? '/');
        onMounted(() => {
            window.location.replace(url);
        });
    },
});
</script>
<template>
    <div />
</template>
