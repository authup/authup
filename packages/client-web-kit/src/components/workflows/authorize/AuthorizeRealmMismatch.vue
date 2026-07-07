<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { useTranslation } from '../../../core';

export default defineComponent({
    components: { VCButton, VCIcon },
    props: {
        clientName: {
            type: String,
            required: true,
        },
        targetRealmName: {
            type: String,
            required: true,
        },
        redirectUri: { type: String as PropType<string | undefined> },
        state: { type: String as PropType<string | undefined> },
        // Only offer the "return to application" redirect when the request
        // redirect_uri was matched against a registered client pattern
        // (open-redirect guard for pattern-less clients).
        redirectUriVerified: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['switch'],
    setup(props, { emit }) {
        const title = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.REALM_MISMATCH_TITLE,
        });

        const text = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.REALM_MISMATCH_TEXT,
            data: {
                client: computed(() => props.clientName),
                realm: computed(() => props.targetRealmName),
            },
        });

        const signInLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.SIGN_IN_TO_REALM,
            data: { realm: computed(() => props.targetRealmName) },
        });

        const returnLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.RETURN_TO_APP,
        });

        const canReturn = computed(() => props.redirectUriVerified && !!props.redirectUri);

        const returnToApp = () => {
            if (!canReturn.value || !props.redirectUri) {
                return;
            }

            const url = new URL(props.redirectUri);
            url.searchParams.set('error', 'access_denied');
            url.searchParams.set(
                'error_description',
                'The resource owner or authorization server denied the request',
            );
            if (props.state) {
                url.searchParams.set('state', props.state);
            }

            if (typeof window !== 'undefined') {
                window.location.href = url.href;
            }
        };

        return {
            title,
            text,
            signInLabel,
            returnLabel,
            canReturn,
            returnToApp,
            switchAccount: () => emit('switch'),
        };
    },
});
</script>
<template>
    <div class="flex flex-col gap-2">
        <div class="text-center">
            <VCIcon
                name="fa6-solid:right-left"
                class="text-6xl text-info-600"
            />
        </div>
        <div class="text-center">
            <h1 class="font-bold">
                {{ title }}
            </h1>
        </div>
        <div class="text-center fs-6 px-3">
            {{ text }}
        </div>

        <div class="flex flex-col gap-2 mt-2">
            <VCButton
                type="button"
                color="primary"
                class="w-full"
                @click.prevent="switchAccount"
            >
                {{ signInLabel }}
            </VCButton>
            <VCButton
                v-if="canReturn"
                type="button"
                color="neutral"
                variant="soft"
                class="w-full"
                @click.prevent="returnToApp"
            >
                {{ returnLabel }}
            </VCButton>
        </div>
    </div>
</template>
