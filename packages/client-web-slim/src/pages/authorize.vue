<!--
  - Copyright (c) 2025.
  -  Author Peter Placzek (tada5hi)
  -  For the full copyright and license information,
  -  view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthorize } from '@authup/client-web-kit';
import type {
    Client, OAuth2AuthorizationCodeRequest, Scope,
} from '@authup/core-kit';
import { defineComponent } from 'vue';
import { injectPayload } from '../di';

export default defineComponent({
    components: {
        AAuthorize,
    },
    setup() {
        const app = injectPayload<{
            codeRequest: OAuth2AuthorizationCodeRequest | undefined,
            error: Error | undefined,
            client: Client | undefined,
            scopes: Scope[] | undefined
        }>();

        return {
            data: app.data,
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
    />
</template>
