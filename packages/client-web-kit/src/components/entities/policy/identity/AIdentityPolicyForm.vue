<script lang="ts">
import type { IdentityPolicy } from '@authup/access';
import type { Policy } from '@authup/core-kit';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { onChange, useUpdatedAt } from '../../../../composables';
import AFormInputList from '../../../utility/form-input-list/AFormInputList.vue';

export default defineComponent({
    components: { AFormInputList },
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive<{ types: string[] }>({ types: [] });

        // Empty container — registers as the 'type' child of the
        // parent `<APolicyForm>` so it can extract `types` via
        // `extractValidupResultsFromChild('type')`.
        const $v = useValidup(new Container<typeof form>(), form, { name: 'type' });

        function assign(data: Partial<IdentityPolicy> = {}) {
            form.types = data.types || [];
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const handleUpdated = (data: string[]) => {
            form.types = data;
            setup.emit('updated', data);
        };

        return {
            handleUpdated,
            $v,
        };
    },
});
</script>
<template>
    <AFormInputList
        :names="$v.fields.types!.$model.value"
        :min-items="1"
        @changed="handleUpdated"
    >
        <template #label>
            Types
        </template>
    </AFormInputList>
</template>
