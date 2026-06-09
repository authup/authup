<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { generateSecret } from '@authup/kit';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { VCFormInput } from '@vuecs/forms';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationNamespace,
    useTranslations,
} from '../../core';

/**
 * Secret input with an attached "regenerate" button rendered inside the
 * `VCFormInput` group append slot. Clicking the button emits a freshly
 * generated, cryptographically strong secret through the same
 * `update:modelValue` channel as typing, so callers can bind it with
 * `v-model` or `:model-value` + `@update:model-value` exactly like a plain
 * `<VCFormInput>`.
 *
 * Mirrors `ANameInput` so name and secret fields share the same
 * input + group-append layout. When `disabled` is set the append button is
 * omitted and a plain disabled input is rendered.
 *
 * The button generates client-side only (a user click), so it never affects
 * SSR. Callers must likewise generate the initial value client-side (e.g. in
 * `onMounted`) — a secret must not be derived from a hydration-stable seed.
 */
export default defineComponent({
    name: 'ASecretInput',
    components: { VCFormInput },
    props: {
        modelValue: {
            type: String as PropType<string | null | undefined>,
            default: '',
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        label: {
            type: String as PropType<string | undefined>,
            default: undefined,
        },
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.GENERATE,
            },
        ]);

        const buttonLabel = computed(() => props.label ?? translationsDefault.generate);

        const onUpdate = (value: string) => {
            emit('update:modelValue', value);
        };

        const generate = () => {
            emit('update:modelValue', generateSecret());
        };

        return {
            buttonLabel,
            onUpdate,
            generate,
        };
    },
});

</script>

<template>
    <VCFormInput
        :model-value="modelValue ?? ''"
        :disabled="disabled"
        :group="!disabled"
        @update:model-value="onUpdate"
    >
        <template
            v-if="!disabled"
            #groupAppend="{ class: appendClass }"
        >
            <button
                type="button"
                :class="appendClass"
                class="cursor-pointer transition-colors hover:bg-bg-elevated"
                :aria-label="buttonLabel"
                :title="buttonLabel"
                @click.prevent="generate"
            >
                <VCIcon
                    aria-hidden="true"
                    name="fa6-solid:arrows-rotate"
                />
            </button>
        </template>
    </VCFormInput>
</template>
