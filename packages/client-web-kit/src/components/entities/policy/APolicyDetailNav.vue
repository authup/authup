<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        policyId: {
            type: String,
            required: true,
        },
    },
    emits: ['click'],
    setup(props, { emit }) {
        const handleClick = (e: Event) => {
            e.preventDefault();
            emit('click', props.policyId);
        };

        return { handleClick };
    },
});
</script>
<template>
    <button
        type="button"
        class="btn btn-xs btn-outline-info"
        title="View policy details"
        aria-label="View policy details"
        @click="handleClick"
    >
        <i class="fa fa-eye" />
    </button>
</template>
