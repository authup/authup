<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthShell, AEndSessionForm } from '@authup/client-web-kit';
import { defineComponent } from 'vue';
import { injectPayload } from '../di';

export default defineComponent({
    components: {
        AAuthShell,
        AEndSessionForm,
    },
    setup() {
        const payload = injectPayload<{
            client?: { name: string },
            hintVerified?: boolean,
            hintSub?: string,
            serverRevoked?: boolean,
            redirect?: string,
        }>();

        return { data: payload.data };
    },
});
</script>
<template>
    <AAuthShell>
        <AEndSessionForm
            :server-revoked="data.serverRevoked"
            :hint-sub="data.hintSub"
            :redirect="data.redirect"
        />
    </AAuthShell>
</template>
