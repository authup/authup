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
import APolicyDetailNav from './APolicyDetailNav.vue';

export default defineComponent({
    components: { APolicyTypeBadge, APolicyDetailNav },
    props: {
        entity: {
            type: Object as PropType<Policy>,
            required: true,
        },
    },
    emits: ['detail'],
    setup(props, { emit }) {
        const handleDetail = () => {
            emit('detail', props.entity);
        };

        return { handleDetail };
    },
});
</script>
<template>
    <APolicyTypeBadge :type="entity.type" />
    <span
        v-if="entity.invert"
        class="badge bg-warning"
    >Inverted</span>
    <APolicyDetailNav
        :policy-id="entity.id"
        @click="handleDetail"
    />
</template>
