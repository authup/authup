<script lang="ts">
/* global window */
import type { Realm } from '@authup/core-kit';
import { CLIENT_WEB_NAME } from '@authup/core-kit';
import {
    ARealmGrid,
    buildAuthorizeURL,
    createPKCE,
    createState,
    saveAuthorizationRequest,
} from '@authup/client-web-kit';
import {
    definePageMeta,
    useToast,
} from '#imports';
import {
    defineNuxtComponent,
    useRoute,
    useRuntimeConfig,
} from '#app';
import LoginSVG from '../../components/svg/LoginSVG';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    components: {
        ARealmGrid,
        LoginSVG,
    },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_OUT]: true });

        const toast = useToast();
        const runtimeConfig = useRuntimeConfig();
        const route = useRoute();

        const handleSelect = async (realm: Realm) => {
            try {
                const pkce = await createPKCE();
                const state = createState();

                const redirectUri = `${window.location.origin}/login/callback`;

                const target = typeof route.query.redirect === 'string' ?
                    route.query.redirect :
                    undefined;

                saveAuthorizationRequest({
                    state,
                    code_verifier: pkce.code_verifier,
                    redirect_uri: redirectUri,
                    client_id: CLIENT_WEB_NAME,
                    realm_id: realm.id,
                    target,
                });

                window.location.href = buildAuthorizeURL({
                    baseURL: runtimeConfig.public.apiUrl as string,
                    clientId: CLIENT_WEB_NAME,
                    realmId: realm.id,
                    redirectUri,
                    scope: 'global openid',
                    state,
                    codeChallenge: pkce.code_challenge,
                    codeChallengeMethod: pkce.code_challenge_method,
                });
            } catch (e) {
                toast.show({
                    variant: 'warning',
                    body: e instanceof Error ? e.message : 'The login could not be initiated.',
                });
            }
        };

        return { handleSelect };
    },
});
</script>
<template>
    <div class="container">
        <div class="text-center">
            <LoginSVG :height="320" />
        </div>

        <ARealmGrid @select="handleSelect" />
    </div>
</template>
