<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { VCIcon } from '@vuecs/icon';
import { defineComponent } from 'vue';

export default defineComponent({
    components: { VCIcon },
    props: {
        isError: { type: Boolean },
        loading: { type: Boolean },
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
            <!--
                CSS rather than an icon: icons resolve in the browser, so a
                server-rendered one is an empty <svg> until the page hydrates,
                which is exactly the moment this has to be visible.
            -->
            <span
                v-if="loading"
                class="inline-block size-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"
                role="status"
            />
            <VCIcon
                v-else
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
