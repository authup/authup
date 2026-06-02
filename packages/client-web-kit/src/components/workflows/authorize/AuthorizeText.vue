<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        isError: { type: Boolean },
        message: {
            type: String,
            required: true,
        },
    },
});
</script>
<template>
    <div class="flex flex-col">
        <div class="text-center">
            <VCIcon
                :name="isError ? 'fa6-solid:exclamation' : 'fa6-solid:info'"
                class="text-9xl"
                :class="{
                    'text-error-600': isError,
                    'text-info-600': !isError,
                }"
            />
        </div>
        <div class="text-center fs-6 p-3">
            {{ message }}
        </div>
    </div>
</template>
