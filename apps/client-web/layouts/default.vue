<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import PageHeader from '../components/header.vue';
import PageSidebar from '../components/sidebar.vue';
import PageFooter from '../components/footer.vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: { PageHeader, PageSidebar, PageFooter },
});
</script>

<template>
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
</template>
