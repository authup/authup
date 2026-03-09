<script lang="ts">
import {
    ALogin,
} from '@authup/client-web-kit';
import {
    definePageMeta,
    useToast,
} from '#imports';
import {
    defineNuxtComponent,
    navigateTo,
    useRoute,
    useRuntimeConfig,
} from '#app';
import LoginSVG from '../components/svg/LoginSVG';
import { LayoutKey } from '../config/layout';

export default defineNuxtComponent({
    components: {
        ALogin,
        LoginSVG,
    },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_OUT]: true,
        });

        const toast = useToast();
        const runtimeConfig = useRuntimeConfig();

        const route = useRoute();

        const handleDone = () => {
            const { redirect, ...query } = route.query;

            navigateTo({
                path: (redirect || '/') as string,
                query,
            });
        };

        const handleFailed = (e: Error) => {
            toast.show({ variant: 'warning', body: e.message });
        };

        const baseUrl = runtimeConfig.public.apiUrl;

        return {
            baseUrl,
            handleFailed,
            handleDone,
        };
    },
});
</script>
<template>
    <div class="container">
        <div class="text-center">
            <LoginSVG :height="320" />
        </div>

        <ALogin
            :base-url="baseUrl"
            @failed="handleFailed"
            @done="handleDone"
        />
    </div>
</template>
