<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { ButtonSize } from '@vuecs/button';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { useAlertDialog } from '@vuecs/overlays';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { DEFAULT_BUTTON_SIZE, useTranslations } from '../../../core';

export default defineComponent({
    components: { VCButton, VCIcon },
    props: {
        value: {
            type: Boolean,
            required: true,
        },
        isBusy: {
            type: Boolean,
            required: true,
        },
        size: {
            type: String as PropType<ButtonSize>,
            default: DEFAULT_BUTTON_SIZE,
        },
        // Confirm the removal transition (assigned → un-assign) via
        // useAlertDialog(). Off by default — un-assigning is reversible, so
        // only high-stakes grants (role / permission) opt in. Adding never prompts.
        withPrompt: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['changed'],
    setup(props, { emit }) {
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.PROCESSING,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.REMOVE,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ADD,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ABORT,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.REMOVE_CONFIRM_TITLE,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.REMOVE_CONFIRM_DESCRIPTION,
            },
        ]);

        // Imperative confirmation dialog, resolved ONLY when `withPrompt` is set
        // — the default (off) never injects the AlertDialogManager, so a toggle
        // that doesn't prompt (scopes, policy-bindings, any downstream consumer)
        // doesn't require `app.use(installOverlays)`. `useAlertDialog()` only
        // calls inject() (no lifecycle hooks), so this one-time conditional
        // resolution in setup is safe. Host: <VCAlertDialogProvider> in the
        // admin console default layout.
        const confirmDialog = props.withPrompt ? useAlertDialog() : undefined;

        const handleClick = async (e: Event) => {
            e.preventDefault();

            // Only the removal transition confirms (currently assigned → this
            // click un-assigns). Adding is low-stakes and never prompts.
            if (confirmDialog && props.value && props.withPrompt) {
                const confirmed = await confirmDialog({
                    title: translations.removeConfirmTitle,
                    description: translations.removeConfirmDescription,
                    confirmLabel: translations.remove,
                    cancelLabel: translations.abort,
                    tone: 'error',
                });

                if (!confirmed) {
                    return;
                }
            }

            emit('changed', !props.value);
        };

        return { handleClick, translations };
    },
});
</script>
<template>
    <VCButton
        type="button"
        :aria-label="isBusy ? translations.processing : (value ? translations.remove : translations.add)"
        :size="size"
        :color="isBusy ? 'neutral' : (value ? 'error' : 'success')"
        :disabled="isBusy"
        @click="handleClick"
    >
        <template #leading>
            <VCIcon :name="isBusy ? 'fa6-solid:question' : (value ? 'fa6-solid:minus' : 'fa6-solid:plus')" />
        </template>
    </VCButton>
</template>
