<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { TranslatorTranslationActionKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import { computed, defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import { DEFAULT_BUTTON_SIZE, useTranslations } from '../../../core';
import type { ContentActionMode } from './types';

// Route-aware action for a page title row: "Add" while the overview route is
// active, "Back" while the add route is active. Any other route renders
// nothing, so a section carrying a second list route (an approval queue, a
// nested lens) does not inherit the button.
export default defineComponent({
    components: { VCButton, VCIcon },
    props: {
        overviewUrl: {
            type: String,
            required: true,
        },
        addUrl: {
            type: String,
            required: true,
        },
        addDisabled: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const route = useRoute();

        const normalize = (value: string) => (
            value.length > 1 && value.endsWith('/') ?
                value.slice(0, -1) :
                value
        );

        const mode = computed<ContentActionMode | undefined>(() => {
            const path = normalize(route.path);

            if (path === normalize(props.addUrl)) {
                return 'back';
            }

            if (path === normalize(props.overviewUrl)) {
                return 'add';
            }

            return undefined;
        });

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ADD,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.BACK,
            },
        ]);

        return {
            buttonSize: DEFAULT_BUTTON_SIZE,
            mode,
            translations,
            VCLink,
        };
    },
});
</script>
<template>
    <VCButton
        v-if="mode === 'back'"
        :as="VCLink"
        :to="overviewUrl"
        :size="buttonSize"
        color="neutral"
        variant="outline"
    >
        <template #leading>
            <VCIcon name="fa6-solid:arrow-left" />
        </template>
        {{ translations.back }}
    </VCButton>
    <VCButton
        v-else-if="mode === 'add'"
        :as="VCLink"
        :to="addUrl"
        :size="buttonSize"
        color="primary"
        :disabled="addDisabled"
    >
        <template #leading>
            <VCIcon name="fa6-solid:plus" />
        </template>
        {{ translations.add }}
    </VCButton>
</template>
