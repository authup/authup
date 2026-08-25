<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { APolicyForm, APolicyTypePicker } from '@authup/client-web-kit';
import type { Policy } from '@authup/core-kit';

export default defineComponent({
    components: {
        APolicyForm,
        APolicyTypePicker,
    },
    emits: ['failed'],
    setup(props, { emit }) {
        const router = useRouter();

        // Policies are administered under the permission domain, so the create
        // gate is PERMISSION_CREATE rather than a POLICY_* permission.
        const type = ref<string | null>(null);
        const handlePicked = (value: string) => {
            type.value = value;
        };

        const handleCreated = (e: Policy) => {
            router.push({ path: `/policies/${e.id}` });
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
    <div class="flex flex-col gap-2">
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
