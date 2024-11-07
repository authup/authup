<script lang="ts">
import { defineNuxtComponent } from '#app';
import { definePageMeta, navigateTo } from '#imports';
import { LayoutKey } from '../config/layout';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_OUT]: true,
        });

        await navigateTo({ path: '/login' });
    },
});
</script>
