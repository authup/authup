<script lang="ts">
import { defineNuxtComponent, useRouter } from '#app';
import { definePageMeta } from '#imports';
import { useStore } from '@authup/client-web-kit';
import { LayoutKey, LayoutNavigationID } from '../config/layout';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.DEFAULT,
        });

        const router = useRouter();

        const query = {
            redirect: '',
        };

        const { redirect } = router.currentRoute.value.query;

        if (
            redirect &&
            typeof redirect === 'string' &&
            !redirect.includes('logout')
        ) {
            query.redirect = redirect;
        }

        const store = useStore();
        await store.logout();

        await router.push({ path: '/login', query });
    },
});
</script>
