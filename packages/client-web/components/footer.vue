<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">

import { defineComponent } from 'vue';
import { BOrchestrator } from 'bootstrap-vue-next';

export default defineComponent({
    components: {
        BOrchestrator,
    },
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
        <BOrchestrator />
    </div>
</template>
<style>
.container,
.container-fluid {
    display: block;
}
</style>
