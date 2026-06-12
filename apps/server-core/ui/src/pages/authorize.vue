<!--
  - Copyright (c) 2025-2026.
  -  Author Peter Placzek (tada5hi)
  -  For the full copyright and license information,
  -  view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthorize } from '@authup/client-web-kit';
import type { Client, OAuth2AuthorizationCodeRequest, Scope } from '@authup/core-kit';
import type { StatusResponseFeatures } from '@authup/core-http-kit';
import type { LinkProperties } from '@vuecs/link';
import { useToast } from '@vuecs/overlays';
import { computed, defineComponent } from 'vue';
import { useBasePath } from '../base-path';
import { injectPayload } from '../di';

export default defineComponent({
    components: { AAuthorize },
    setup() {
        const app = injectPayload<{
            codeRequest: OAuth2AuthorizationCodeRequest | undefined,
            error: Error | undefined,
            client: Client | undefined,
            scopes: Scope[] | undefined,
            features: StatusResponseFeatures | undefined,
            requestPath: string | undefined
        }>();

        const withBasePath = useBasePath();

        const buildWorkflowLink = (path: string) : LinkProperties => {
            const params = new URLSearchParams();
            if (app.data.codeRequest && app.data.codeRequest.realm_id) {
                params.set('realm_id', app.data.codeRequest.realm_id);
            }
            if (app.data.requestPath) {
                params.set('redirect', app.data.requestPath);
            }

            const qs = params.toString();
            return { href: withBasePath(`${path}${qs ? `?${qs}` : ''}`) };
        };

        const registerLink = computed(() => (
            app.data.features && app.data.features.registration ?
                buildWorkflowLink('/register') :
                undefined
        ));

        const passwordForgotLink = computed(() => (
            app.data.features && app.data.features.passwordRecovery ?
                buildWorkflowLink('/password-forgot') :
                undefined
        ));

        const toast = useToast();
        const handleFailed = (message: string) => {
            toast.add({
                description: message,
                color: 'error',
            });
        };

        return {
            data: app.data,
            registerLink,
            passwordForgotLink,
            handleFailed,
        };
    },
});
</script>
<template>
    <AAuthorize
        :code-request="data.codeRequest"
        :client="data.client"
        :scopes="data.scopes"
        :error="data.error"
        :register-link="registerLink"
        :password-forgot-link="passwordForgotLink"
        @failed="handleFailed"
    />
</template>
