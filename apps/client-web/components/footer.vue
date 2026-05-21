<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">

import { defineComponent } from 'vue';
import { VCToastProvider, VCToaster } from '@vuecs/overlays';

export default defineComponent({
    components: { VCToaster, VCToastProvider },
    computed: {
        year() {
            return new Date().getFullYear();
        },
    },
});
</script>
<template>
    <div>
        <div class="page-footer">
            <div class="copyright">
                &copy; Authup {{ year }}
            </div>
        </div>
        <!-- Old composables/toast.ts wrapper defaulted bvnext's per-toast
             position to 'top-center'; preserve that across the migration
             by setting it once on the viewport.
             <VCToastProvider> is required: <VCToaster> renders Reka's
             <ToastViewport>, which injects ToastProviderContext set up by
             <ToastProvider>. Without this wrapper, mounting throws
             "Injection Symbol(ToastProviderContext) not found." -->
        <VCToastProvider>
            <VCToaster position="top-center" />
        </VCToastProvider>
    </div>
</template>
<style>
.container,
.container-fluid {
    display: block;
}
</style>
