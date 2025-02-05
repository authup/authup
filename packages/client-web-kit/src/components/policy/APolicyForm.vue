<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, ref } from 'vue';
import type { Policy } from '@authup/core-kit';
import { DomainType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import { BuiltInPolicyType } from '@authup/access';
import { onChange, useIsEditing, useUpdatedAt } from '../../composables';
import { createResourceManager, extractVuelidateResultsFromChild } from '../../core';
import { AFormSubmit } from '../utility/AFormSubmit';
import APolicyBasicForm from './APolicyBasicForm.vue';
import APolicyTypePicker from './APolicyTypePicker.vue';
import AAttributeNamesPolicy from './built-in/AAttributeNamesPolicy.vue';
import ADatePolicyForm from './built-in/ADatePolicyForm.vue';
import ATimePolicyForm from './built-in/ATimePolicyForm.vue';

export default defineComponent({
    components: { AFormSubmit, APolicyTypePicker, APolicyBasicForm },
    props: {
        entity: {
            type: Object as PropType<Policy>,
        },
    },
    setup(props, ctx) {
        const type = ref<string | null>(null);
        const typeComponents : Record<string, any> = {
            [BuiltInPolicyType.DATE]: ADatePolicyForm,
            [BuiltInPolicyType.TIME]: ATimePolicyForm,
            [BuiltInPolicyType.ATTRIBUTE_NAMES]: AAttributeNamesPolicy,
        };

        const manager = createResourceManager({
            type: `${DomainType.POLICY}`,
            setup: ctx,
            props,
        });

        const updatedAt = useUpdatedAt(manager.data);
        const isEditing = useIsEditing(manager.data);

        const setType = (val: string | null): void => {
            type.value = val;
        };

        const setTypeByEntity = () => {
            if (manager.data.value && manager.data.value.type) {
                type.value = manager.data.value.type;
            }
        };

        setTypeByEntity();

        onChange(updatedAt, () => setTypeByEntity());

        const vuelidate = useVuelidate({ $stopPropagation: true });

        const submit = async () => {
            if (vuelidate.value.$invalid) {
                return;
            }

            const data : Partial<Policy> = {
                ...extractVuelidateResultsFromChild(vuelidate, 'basic'),
                ...extractVuelidateResultsFromChild(vuelidate, 'type'),
            };

            if (type.value) {
                data.type = type.value;
            }

            await manager.createOrUpdate(data);
        };

        return {
            type,
            typeComponents,
            setType,
            data: manager.data,
            busy: manager.busy,
            isEditing,
            submit,
            vuelidate,
        };
    },
});
</script>
<template>
    <div class="d-flex flex-column gap-2">
        <template v-if="!isEditing">
            <APolicyTypePicker
                v-if="!isEditing"
                :type="type"
                @pick="setType"
            />
        </template>

        <template v-if="type">
            <h6>{{ type.slice(0,1).toUpperCase() }}{{ type.slice(1) }}</h6>
            <APolicyBasicForm :entity="data" />

            <component :is="typeComponents[type]" />

            <div>
                <AFormSubmit
                    :is-invalid="vuelidate.$invalid || !type"
                    :is-busy="busy"
                    :is-editing="isEditing"
                    @submit="submit"
                />
            </div>
        </template>
    </div>
</template>
