<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Scope } from '@authup/core-kit';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';

export default defineComponent({
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
        const isEnabled = computed(() => props.requested.indexOf(props.entity.name) !== -1);

        return {
            isEnabled,
        };
    },
});
</script>
<template>
    <div>
        <div class="text-center">
            <i
                class="fa-solid"
                :class="{
                    'fa-check text-success': isEnabled,
                    'fa-times text-danger': !isEnabled
                }"
            />
        </div>
        <div>
            <strong>{{ entity.name }}</strong>

            <template v-if="entity.description">
                <p>{{ entity.description }}</p>
            </template>
        </div>
    </div>
</template>
