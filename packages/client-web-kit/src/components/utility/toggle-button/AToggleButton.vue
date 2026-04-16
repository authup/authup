<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        value: {
            type: Boolean,
            required: true,
        },
        isBusy: {
            type: Boolean,
            required: true,
        },
    },
    emits: ['changed'],
    setup(props, { emit }) {
        const handleClick = (e: Event) => {
            e.preventDefault();
            emit('changed', !props.value);
        };

        return { handleClick };
    },
});
</script>
<template>
    <button
        type="button"
        :aria-label="isBusy ? 'Processing' : (value ? 'Remove' : 'Add')"
        :class="['btn btn-xs', {
            'btn-dark': isBusy,
            'btn-success': !isBusy && !value,
            'btn-danger': !isBusy && value,
        }]"
        :disabled="isBusy"
        @click="handleClick"
    >
        <i
            aria-hidden="true"
            :class="['fa', {
                'fa-question': isBusy,
                'fa-plus': !isBusy && !value,
                'fa-minus': !isBusy && value,
            }]"
        />
    </button>
</template>
