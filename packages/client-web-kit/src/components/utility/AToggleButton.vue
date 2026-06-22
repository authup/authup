<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { computed, defineComponent } from 'vue';
import { VCButton } from '@vuecs/button';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { useTranslationsForNamespace } from '../../core';

/**
 * Tri-state toggle button used in entity pickers' #itemActions slot
 * (realm picker on UserForm / RobotForm, policy-parent picker, etc.).
 *
 *   value=false → green plus  ("add to selection")
 *   value=true  → red minus   ("remove from selection")
 *   isBusy=true → dark question mark (loading)
 *
 * Replaces the `renderToggleButton` render-function helper in
 * `utility/toggle-button/module.ts` and the inline copies in
 * ARobotForm.vue / AUserForm.vue.
 */
export default defineComponent({
    name: 'AToggleButton',
    components: { VCButton },
    props: {
        value: { type: Boolean, default: false },
        isBusy: { type: Boolean, default: false },
    },
    emits: ['changed'],
    setup(props, { emit }) {
        const translationsClient = useTranslationsForNamespace(
            TranslatorTranslationNamespace.CLIENT,
            [
                { key: TranslatorTranslationClientKey.SELECTION_UPDATING },
                { key: TranslatorTranslationClientKey.SELECTION_REMOVE },
                { key: TranslatorTranslationClientKey.SELECTION_ADD },
            ],
        );

        const ariaLabel = computed(() => {
            if (props.isBusy) return translationsClient.selectionUpdating;
            return props.value ? translationsClient.selectionRemove : translationsClient.selectionAdd;
        });

        return {
            ariaLabel,
            toggle() {
                emit('changed', !props.value);
            },
        };
    },
});

</script>

<template>
    <VCButton
        type="button"
        size="sm"
        :color="isBusy ? 'neutral' : (value ? 'error' : 'success')"
        :aria-label="ariaLabel"
        :aria-busy="isBusy ? 'true' : 'false'"
        :aria-pressed="value ? 'true' : 'false'"
        :disabled="isBusy"
        @click.prevent="toggle"
    >
        <VCIcon
            aria-hidden="true"
            :name="isBusy ? 'fa6-solid:question' : (value ? 'fa6-solid:minus' : 'fa6-solid:plus')"
        />
    </VCButton>
</template>
