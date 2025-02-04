<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, ref } from 'vue';
import type { Policy } from '@authup/core-kit';
import { DomainType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import { BuiltInPolicyType } from '@authup/access';
import { onChange, useUpdatedAt } from '../../composables';
import { createResourceManager, extractVuelidateResultsFromChild } from '../../core';
import APolicyBasicForm from './APolicyBasicForm.vue';
import APolicyTypePicker from './APolicyTypePicker.vue';
import ATimePolicyForm from './built-in/ATimePolicyForm.vue';

export default defineComponent({
    components: { APolicyTypePicker, APolicyBasicForm },
    props: {
        entity: {
            type: Object as PropType<Policy>,
        },
    },
    setup(props, ctx) {
        const type = ref<string | null>(null);
        const typeComponents : Record<string, any> = {
            [BuiltInPolicyType.TIME]: ATimePolicyForm,
        };

        const manager = createResourceManager({
            type: `${DomainType.POLICY}`,
            setup: ctx,
            props,
        });

        const updatedAt = useUpdatedAt(manager.data);

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
            submit,
            vuelidate,
        };
    },
});
</script>
<template>
    <div>
        <APolicyTypePicker
            :type="type"
            @pick="setType"
        />

        <template v-if="type">
            <hr>
            <APolicyBasicForm :entity="data" />

            <component :is="typeComponents[type]" />
        </template>

        {{ vuelidate.$invalid }}
    </div>
</template>
