<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { Policy } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import APolicyTypeBadge from './APolicyTypeBadge.vue';

export default defineComponent({
    components: { APolicyTypeBadge },
    props: {
        entity: {
            type: Object as PropType<Policy>,
            required: true,
        },
    },
});
</script>
<template>
    <div>
        <div class="d-flex flex-row gap-2 mb-2">
            <strong style="min-width: 120px">Name</strong>
            <div>{{ entity.name }}</div>
        </div>
        <div class="d-flex flex-row gap-2 mb-2">
            <strong style="min-width: 120px">Type</strong>
            <div>
                <APolicyTypeBadge :type="entity.type" />
            </div>
        </div>
        <div
            v-if="entity.display_name"
            class="d-flex flex-row gap-2 mb-2"
        >
            <strong style="min-width: 120px">Display Name</strong>
            <div>{{ entity.display_name }}</div>
        </div>
        <div
            v-if="entity.description"
            class="d-flex flex-row gap-2 mb-2"
        >
            <strong style="min-width: 120px">Description</strong>
            <div>{{ entity.description }}</div>
        </div>
        <div
            v-if="entity.invert"
            class="d-flex flex-row gap-2 mb-2"
        >
            <strong style="min-width: 120px">Invert</strong>
            <div>
                <span class="badge bg-warning">Yes</span>
            </div>
        </div>
        <div
            v-if="entity.built_in"
            class="d-flex flex-row gap-2 mb-2"
        >
            <strong style="min-width: 120px">Built-in</strong>
            <div>
                <span class="badge bg-secondary">Yes</span>
            </div>
        </div>
    </div>
</template>
