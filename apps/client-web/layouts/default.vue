<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { VCToastProvider } from '@vuecs/overlays';
import PageHeader from '../components/header.vue';
import PageSidebar from '../components/sidebar.vue';
import PageFooter from '../components/footer.vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        PageHeader,
        PageSidebar,
        PageFooter,
        VCToastProvider,
    },
});
</script>

<template>
    <!--
        VCToastProvider wraps the whole layout so descendants (toaster
        in the footer, any future <VCToast> usage in pages or kit
        components) share the Reka ToastProviderContext. Mounting it
        at the layout root rather than inside the footer means
        alternate layouts (or pages mounted without a footer) don't
        silently break the toast viewport — the provider scope is
        layout-wide, not footer-local.
    -->
    <VCToastProvider>
        <div id="app">
            <PageHeader />
            <div class="page-wrapper">
                <PageSidebar />
                <div class="page-content">
                    <NuxtPage />
                </div>
            </div>
            <PageFooter />
        </div>
    </VCToastProvider>
</template>
