<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthApp } from '@authup/client-web-kit';
import { defineComponent } from 'vue';
import { createColorMode } from './color-mode';

export default defineComponent({
    components: { AAuthApp },
    setup() {
        const { isDark } = createColorMode();

        return { isDark };
    },
});
</script>
<template>
    <!--
        <AAuthApp> is the shared app shell (mirrored by the auth pages and
        client-admin-console's auth layout): the <VCToastProvider> root every
        descendant <VCToaster>/toast primitive needs, the gadget cluster
        (color mode + language) and the toaster viewport fed by useToast().
    -->
    <AAuthApp v-model:dark="isDark">
        <RouterView />
    </AAuthApp>
</template>
