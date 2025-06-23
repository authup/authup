<!--
  - Copyright (c) 2025-2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthorize } from '@authup/client-web-kit';
import type {
    Client, OAuth2AuthorizationCodeRequest, Scope,
} from '@authup/core-kit';
import { isObject } from '@authup/kit';
import { defineComponent } from 'vue';

const extractFromWindow = <T = any>(key: string) : T => {
    if (
        typeof window !== 'undefined' &&
        isObject(window)
    ) {
        return window[key];
    }

    return undefined;
};

export default defineComponent({
    components: {
        AAuthorize,
    },
    setup() {
        const codeRequest = extractFromWindow<OAuth2AuthorizationCodeRequest | undefined>('codeRequest');
        const error = extractFromWindow<Error | undefined>('error');
        const client = extractFromWindow<Client | undefined>('client');
        const scopes = extractFromWindow<Scope[] | undefined>('scopes');

        return {
            codeRequest,
            error,
            client,
            scopes,
        };
    },
});
</script>
<template>
    <AAuthorize
        :code-request="codeRequest"
        :client="client"
        :scopes="scopes"
        :error="error"
    />
</template>
