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
        message: {
            type: String,
            required: true,
        },
    },
});
</script>
<template>
    <div class="flex-column">
        <div class="text-center">
            <i class="fa-solid fa-exclamation fa-10x text-danger" />
        </div>
        <div class="text-center fs-6 p-3">
            {{ message }}
        </div>
    </div>
</template>
