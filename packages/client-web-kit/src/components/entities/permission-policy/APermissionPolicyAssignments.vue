<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { Policy } from '@authup/core-kit';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    ref,
} from 'vue';
import type { ButtonSize } from '@vuecs/button';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import {
    VCModal,
    VCModalClose,
    VCModalContent,
    VCModalTitle,
} from '@vuecs/overlays';
import { TranslatorTranslationActionKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { DEFAULT_BUTTON_SIZE, useTranslations } from '../../../core';
import APermissionPolicyAssignment from './APermissionPolicyAssignment.vue';
import { APolicies } from '../policy';
import APolicyInlineInfo from '../policy/APolicyInlineInfo.vue';
import APolicySummary from '../policy/APolicySummary.vue';

export default defineComponent({
    components: {
        APolicies,
        APermissionPolicyAssignment,
        APolicyInlineInfo,
        APolicySummary,
        VCButton,
        VCIcon,
        VCModal,
        VCModalContent,
        VCModalTitle,
        VCModalClose,
    },
    props: {
        entityId: {
            type: String,
            required: true,
        },
        size: {
            type: String as PropType<ButtonSize>,
            default: DEFAULT_BUTTON_SIZE,
        },
    },
    setup(props, { slots }) {
        const translationsAction = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.CLOSE,
            },
        ]);

        const detailPolicy = ref<Policy | null>(null);

        const forwardedSlots = computed(() => Object.fromEntries(Object.entries(slots).filter(([name]) => name !== 'item')));

        return {
            detailPolicy,
            forwardedSlots,
            translationsAction,
        };
    },
});
</script>
<template>
    <div>
        <APolicies :query="{ filters: { parent_id: null } }">
            <template #item="{ data }">
                <div>{{ data.name }}</div>
                <APolicyInlineInfo
                    :entity="data"
                    @detail="detailPolicy = $event"
                />
                <div class="ms-auto">
                    <APermissionPolicyAssignment
                        :key="data.id"
                        :permission-id="entityId"
                        :policy-id="data.id"
                    />
                </div>
            </template>
            <template
                v-for="(_, name) in forwardedSlots"
                :key="name"
                #[name]="slotData"
            >
                <slot
                    :name="name"
                    v-bind="slotData ?? {}"
                />
            </template>
        </APolicies>

        <VCModal
            :open="!!detailPolicy"
            @update:open="(value) => { if (!value) { detailPolicy = null; } }"
        >
            <VCModalContent v-if="detailPolicy">
                <div class="flex items-center justify-between gap-2">
                    <VCModalTitle>{{ detailPolicy.name }}</VCModalTitle>
                    <VCModalClose
                        class="text-fg-muted hover:text-fg"
                        :aria-label="translationsAction.close"
                    >
                        <VCIcon name="fa6-solid:xmark" />
                    </VCModalClose>
                </div>
                <APolicySummary :entity="detailPolicy" />
                <div class="flex items-center justify-end gap-2">
                    <VCButton
                        type="button"
                        :size="size"
                        color="neutral"
                        variant="soft"
                        :label="translationsAction.close"
                        @click="detailPolicy = null"
                    />
                </div>
            </VCModalContent>
        </VCModal>
    </div>
</template>
