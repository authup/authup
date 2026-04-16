<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
/* global document, KeyboardEvent */
import type { Policy } from '@authup/core-kit';
import {
    computed,
    defineComponent,
    onMounted,
    onUnmounted,
    ref,
} from 'vue';
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
    },
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        const detailPolicy = ref<Policy | null>(null);

        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && detailPolicy.value) {
                detailPolicy.value = null;
            }
        };

        onMounted(() => {
            document.addEventListener('keydown', handleKeydown);
        });

        onUnmounted(() => {
            document.removeEventListener('keydown', handleKeydown);
        });

        const forwardedSlots = computed(() => Object.fromEntries(Object.entries(slots).filter(([name]) => name !== 'item')));

        return { detailPolicy, forwardedSlots };
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

        <Teleport
            v-if="detailPolicy"
            to="body"
        >
            <div
                class="modal-backdrop fade show"
                @click="detailPolicy = null"
            />
            <div
                class="modal fade show d-block"
                tabindex="-1"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="`policy-detail-modal-${detailPolicy.id}`"
            >
                <div
                    class="modal-dialog"
                    role="document"
                    @click.stop
                >
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5
                                :id="`policy-detail-modal-${detailPolicy.id}`"
                                class="modal-title"
                            >
                                {{ detailPolicy.name }}
                            </h5>
                            <button
                                type="button"
                                class="btn-close"
                                aria-label="Close"
                                @click="detailPolicy = null"
                            />
                        </div>
                        <div class="modal-body">
                            <APolicySummary :entity="detailPolicy" />
                        </div>
                        <div class="modal-footer">
                            <button
                                type="button"
                                class="btn btn-secondary btn-xs"
                                @click="detailPolicy = null"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
