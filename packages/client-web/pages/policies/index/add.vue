<script lang="ts">
import { defineComponent, ref } from 'vue';
import { APolicyForm, APolicyTypePicker } from '@authup/client-web-kit';
import type { Policy } from '@authup/core-kit';
import { navigateTo } from '#app';

export default defineComponent({
    components: {
        APolicyForm,
        APolicyTypePicker,
    },
    setup(props, { emit }) {
        const type = ref<string | null>(null);
        const handlePicked = (value: string) => {
            type.value = value;
        };

        const handleCreated = (e: Policy) => {
            navigateTo({ path: `/policies/${e.id}` });
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return {
            handleCreated,
            handleFailed,
            handlePicked,
            type,
        };
    },
});
</script>
<template>
    <div class="d-flex flex-column gap-2">
        <APolicyTypePicker @pick="handlePicked" />

        <template v-if="type">
            <APolicyForm
                :type="type"
                @failed="handleFailed"
                @created="handleCreated"
            />
        </template>
    </div>
</template>
