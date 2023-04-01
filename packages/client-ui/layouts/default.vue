<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script>
import pageHeader from '../components/header';
import pageSidebar from '../components/sidebar';
import pageFooter from '../components/footer';

export default {
    components: {
        pageHeader,
        pageFooter,
        pageSidebar,
    },
};
</script>

<template>
    <div id="app">
        <page-header />
        <div class="page-wrapper">
            <page-sidebar />
            <div class="page-content">
                <slot />
            </div>
        </div>
        <page-footer />
    </div>
</template>
<style>
#__nuxt,
#__layout,
#app {
    height: 100%;
}
</style>
