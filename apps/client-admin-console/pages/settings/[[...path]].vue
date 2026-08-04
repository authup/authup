<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineComponent } from 'vue';
import { definePageMeta, navigateTo, useRoute } from '#imports';
import { useAccountConsoleURL } from '../../composables/account-console';
import { LayoutKey } from '../../config/layout';

// Self-service moved to the account console, served by server-core on the
// IdP origin. This stub keeps the sidebar entry and old bookmarks working
// by mapping each retired settings path onto its account console route.
const PATH_MAP : Record<string, string> = {
    '': '/',
    password: '/password',
    mfa: '/authenticators',
    sessions: '/sessions',
    applications: '/applications',
};

export default defineComponent({
    async setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const route = useRoute();
        const segments = route.params.path;
        const key = Array.isArray(segments) ? segments.join('/') : (segments ?? '');

        await navigateTo(
            useAccountConsoleURL(PATH_MAP[key] ?? '/'),
            { external: true, redirectCode: 302 },
        );
    },
});
</script>
<template>
    <div />
</template>
