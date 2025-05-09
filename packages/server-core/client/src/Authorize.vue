<!--
  - Copyright (c) 2025-2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { AAuthorize } from '@authup/client-web-kit';
import type { OAuth2AuthorizationData } from '@authup/core-kit';
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
        const authorize = extractFromWindow<OAuth2AuthorizationData | undefined>('authorize');
        const authorizeMessage = extractFromWindow<string | undefined>('authorizeMessage');

        return {
            authorize,
            authorizeMessage,
        };
    },
});
</script>
<template>
    <AAuthorize
        :state="authorize"
        :message="authorizeMessage"
    />
</template>
