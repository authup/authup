<script lang="ts">
import type { Policy } from '@authup/core-kit';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';

export default defineComponent({
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup() {
        // Empty container: registers as the 'type' child of the parent
        // `<APolicyForm>`. The type has no options besides `invert`, which
        // the basic form owns.
        useValidup(new Container(), reactive({}), { name: 'type' });

        return {};
    },
});
</script>
<template>
    <div />
</template>
