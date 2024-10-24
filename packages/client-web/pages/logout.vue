<script lang="ts">
import { injectStore } from '@authup/client-web-kit';
import { defineNuxtComponent, useRouter } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '../config/layout';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const router = useRouter();

        const query : Record<string, any> = {};

        const { redirect } = router.currentRoute.value.query;

        if (
            redirect &&
            typeof redirect === 'string' &&
            !redirect.includes('logout')
        ) {
            query.redirect = redirect;
        }

        const store = injectStore();
        await store.logout();

        await router.push({ path: '/login', query });
    },
});
</script>
