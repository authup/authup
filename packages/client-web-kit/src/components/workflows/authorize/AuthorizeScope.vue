<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Scope } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { VCIcon } from '@vuecs/icon';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { useEntityNameTranslator } from '../../../core';

export default defineComponent({
    components: { VCIcon },
    props: {
        entity: {
            type: Object as PropType<Scope>,
            required: true,
        },
        requested: {
            type: Array as PropType<string[]>,
            default: () => [],
        },
    },
    setup(props) {
        const translateEntityName = useEntityNameTranslator();

        const isEnabled = computed(() => props.requested.includes(props.entity.name));
        const label = computed(() => translateEntityName(EntityType.SCOPE, props.entity));

        return { isEnabled, label };
    },
});
</script>
<template>
    <div>
        <div class="text-center">
            <VCIcon
                :name="isEnabled ? 'fa6-solid:check' : 'fa6-solid:xmark'"
                :class="{
                    'text-success-600': isEnabled,
                    'text-error-600': !isEnabled,
                }"
            />
        </div>
        <div>
            <strong>{{ label }}</strong>

            <template v-if="entity.description">
                <p>{{ entity.description }}</p>
            </template>
        </div>
    </div>
</template>
