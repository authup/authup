<!--
  Copyright (c) 2021-2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { VCAlertDialogProvider, VCToastProvider } from '@vuecs/overlays';
import { defineComponent } from 'vue';
import PageHeader from '../components/header.vue';
import PageSidebar from '../components/sidebar.vue';
import PageFooter from '../components/footer.vue';

export default defineComponent({
    components: {
        PageHeader,
        PageSidebar,
        PageFooter,
        VCAlertDialogProvider,
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
                    <RouterView />
                </div>
            </div>
            <PageFooter />
        </div>

        <!--
            Single host for the imperative useAlertDialog() confirmation API
            (e.g. <AEntityDelete>'s delete prompt). The AlertDialogManager is
            provided app-wide by `app.use(installOverlays)` in src/main.ts,
            so one provider under the authenticated shell drains
            confirmations from every page. Placed beside the toaster, not
            context-scoped like <VCToastProvider>.
        -->
        <VCAlertDialogProvider />
    </VCToastProvider>
</template>
