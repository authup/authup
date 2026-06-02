<script lang="ts">
import { type PropType, defineComponent, reactive } from 'vue';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import type { Policy } from '@authup/core-kit';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import type { DatePolicy } from '@authup/access';
import { assignFormProperties } from '../../../../core';
import { onChange, useUpdatedAt } from '../../../../composables';

export default defineComponent({
    components: { VCFormInput, VCFormGroup },
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            start: '',
            end: '',
        });

        // No backend validator covers date-policy attributes today —
        // an empty `Container` registers the child slot ('type') with
        // the parent `<APolicyForm>` collector so it can extract this
        // form's state via `extractValidupResultsFromChild('type')`.
        const $v = useValidup(new Container<typeof form>(), form, { name: 'type' });

        function assign(data: Partial<DatePolicy> = {}) {
            assignFormProperties(form, data as Record<string, unknown>);
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const handleUpdated = () => {
            setup.emit('updated', {
                data: form,
                valid: !$v.$invalid.value,
            });
        };

        return {
            handleUpdated,
            $v,
            useFieldValidation,
        };
    },
});
</script>
<template>
    <div>
        <VCFormGroup :validation="useFieldValidation($v.fields.start!)">
            <template #label>
                Start
            </template>
            <VCFormInput
                v-model="$v.fields.start!.$model.value"
                placeholder="YYYY-MM-DD"
                @change="handleUpdated"
            />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation($v.fields.end!)">
            <template #label>
                End
            </template>
            <VCFormInput
                v-model="$v.fields.end!.$model.value"
                placeholder="YYYY-MM-DD"
                @change="handleUpdated"
            />
        </VCFormGroup>
    </div>
</template>
