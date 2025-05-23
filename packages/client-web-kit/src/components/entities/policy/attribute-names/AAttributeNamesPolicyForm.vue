<script lang="ts">
import type { AttributeNamesPolicy } from '@authup/access';
import type { Policy } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    defineComponent, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../../../composables';
import AFormInputList from '../../../utility/form-input-list/AFormInputList.vue';

export default defineComponent({
    components: {
        AFormInputList,
    },
    props: {
        entity: {
            type: Object as PropType<Partial<Policy>>,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive<{ names: string[] }>({
            names: [],
        });

        const vuelidate = useVuelidate({
            names: {},
        }, form, {
            $registerAs: 'type',
        });

        function assign(data: Partial<AttributeNamesPolicy> = {}) {
            form.names = data.names;
        }

        setup.expose({
            assign,
        });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const handleUpdated = (data: string[]) => {
            form.names = data;
            setup.emit('updated', data);
        };

        return {
            handleUpdated,

            vuelidate,
        };
    },
});
</script>
<template>
    <AFormInputList
        :names="vuelidate.names.$model"
        :min-items="1"
        @changed="handleUpdated"
    />
</template>
