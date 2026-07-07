<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { computed, defineComponent } from 'vue';
import { useTranslation } from '../../../core';

export default defineComponent({
    components: { VCButton, VCIcon },
    props: {
        identityName: {
            type: String,
            required: true,
        },
    },
    emits: ['continue', 'switch'],
    setup(props, { emit }) {
        const title = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.SELECT_ACCOUNT_TITLE,
        });

        const continueLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.CONTINUE_AS,
            data: { name: computed(() => props.identityName) },
        });

        const switchLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.USE_ANOTHER_ACCOUNT,
        });

        return {
            title,
            continueLabel,
            switchLabel,
            continueAccount: () => emit('continue'),
            switchAccount: () => emit('switch'),
        };
    },
});
</script>
<template>
    <div class="flex flex-col gap-2">
        <div class="text-center">
            <VCIcon
                name="fa6-solid:user"
                class="text-6xl text-info-600"
            />
        </div>
        <div class="text-center">
            <h1 class="font-bold">
                {{ title }}
            </h1>
        </div>

        <div class="flex flex-col gap-2 mt-2">
            <VCButton
                type="button"
                color="primary"
                class="w-full"
                @click.prevent="continueAccount"
            >
                {{ continueLabel }}
            </VCButton>
            <VCButton
                type="button"
                color="neutral"
                variant="soft"
                class="w-full"
                @click.prevent="switchAccount"
            >
                {{ switchLabel }}
            </VCButton>
        </div>
    </div>
</template>
