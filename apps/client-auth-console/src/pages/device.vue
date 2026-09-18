<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import { AAuthShell, ADeviceVerifyForm } from '@authup/client-web-kit';
import type { StatusResponseFeatures } from '@authup/core-http-kit';
import type { LinkProps } from '@vuecs/link';
import { useToast } from '@vuecs/overlays';
import { computed, defineComponent, onMounted } from 'vue';
import { useBasePath } from '../base-path';
import { injectPayload } from '../di';

export default defineComponent({
    components: {
        AAuthShell,
        ADeviceVerifyForm,
    },
    setup() {
        const payload = injectPayload<{
            features?: StatusResponseFeatures,
            userCode?: string,
            federatedLogin?: { providerId: string },
            error?: string
        }>();

        // Both have done their job once the page has read them from the
        // payload: a reload must not re-attempt a completion whose cookie is
        // spent, nor show a refusal that belonged to an earlier attempt.
        onMounted(() => {
            if (typeof window === 'undefined') {
                return;
            }

            const url = new URL(window.location.href);
            if (!url.searchParams.has('provider') && !url.searchParams.has('error')) {
                return;
            }

            url.searchParams.delete('provider');
            url.searchParams.delete('error');
            window.history.replaceState(window.history.state, '', url.href);
        });

        const withBasePath = useBasePath();

        const requestPath = computed<string>(() => {
            const params = new URLSearchParams();
            if (payload.data.userCode) {
                params.set('user_code', payload.data.userCode);
            }

            const qs = params.toString();
            return `/device${qs ? `?${qs}` : ''}`;
        });

        const buildWorkflowLink = (path: string) : LinkProps => {
            const params = new URLSearchParams();
            params.set('redirect', requestPath.value);

            return { href: withBasePath(`${path}?${params.toString()}`) };
        };

        const registerLink = computed(() => (
            payload.data.features && payload.data.features.registration ?
                buildWorkflowLink('/register') :
                undefined
        ));

        const passwordForgotLink = computed(() => (
            payload.data.features && payload.data.features.passwordRecovery ?
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
            data: payload.data,
            registerLink,
            passwordForgotLink,
            handleFailed,
        };
    },
});
</script>
<template>
    <AAuthShell>
        <ADeviceVerifyForm
            :user-code="data.userCode"
            :federated-login="data.federatedLogin"
            :error="data.error"
            :register-link="registerLink"
            :password-forgot-link="passwordForgotLink"
            @failed="handleFailed"
        />
    </AAuthShell>
</template>
