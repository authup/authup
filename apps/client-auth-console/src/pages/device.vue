<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthShell, ADeviceVerifyForm } from '@authup/client-web-kit';
import type { StatusResponseFeatures } from '@authup/core-http-kit';
import type { LinkProps } from '@vuecs/link';
import { useToast } from '@vuecs/overlays';
import { computed, defineComponent } from 'vue';
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
            userCode?: string
        }>();

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
            :register-link="registerLink"
            :password-forgot-link="passwordForgotLink"
            @failed="handleFailed"
        />
    </AAuthShell>
</template>
