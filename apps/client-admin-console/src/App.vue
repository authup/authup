<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { 
    AAuthApp, 
    AAuthShell, 
    AWorkflowDisabledNotice, 
    createColorMode, 
} from '@authup/client-web-kit';
import { computed, defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import { injectAdminConsoleConfig } from './di';
import AuthLayout from './layouts/auth.vue';
import DefaultLayout from './layouts/default.vue';

export default defineComponent({
    components: {
        AAuthApp,
        AAuthShell,
        AWorkflowDisabledNotice,
        AuthLayout,
        DefaultLayout,
    },
    setup() {
        const config = injectAdminConsoleConfig();
        const route = useRoute();
        const { isDark } = createColorMode();

        // The auth entry pages (login, callback, logout) render without the
        // app chrome; everything else gets header, sidebar and footer.
        const layout = computed(() => (route.meta.layout === 'auth' ? 'AuthLayout' : 'DefaultLayout'));

        return {
            enabled: config.enabled,
            isDark,
            layout,
        };
    },
});
</script>
<template>
    <!--
        <Suspense> because the detail pages fetch their record in an
        `async setup()`, the shape they had under Nuxt (which wraps every
        page in one). The nested <RouterView>s inside the layouts suspend
        this same boundary.

        ADMIN_CONSOLE_ENABLED=false: the serving side injects the flag and
        the shell renders the disabled notice instead of the app (no 404, a
        bookmark still lands somewhere readable).
    -->
    <Suspense v-if="enabled">
        <component :is="layout" />
    </Suspense>
    <AAuthApp
        v-else
        v-model:dark="isDark"
    >
        <AAuthShell>
            <AWorkflowDisabledNotice />
        </AAuthShell>
    </AAuthApp>
</template>
