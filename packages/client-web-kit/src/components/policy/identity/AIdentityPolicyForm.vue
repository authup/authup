<script lang="ts">
import type { IdentityPolicy } from '@authup/access';
import type { Policy } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    defineComponent, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../../composables';
import AInputListForm from '../../utility/AInputListForm.vue';

export default defineComponent({
    components: {
        AInputListForm,
    },
    props: {
        entity: {
            type: Object as PropType<Partial<Policy>>,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive<{ types: string[] }>({
            types: [],
        });

        const vuelidate = useVuelidate({
            types: {},
        }, form, {
            $registerAs: 'type',
        });

        function assign(data: Partial<IdentityPolicy> = {}) {
            form.types = data.types;
        }

        setup.expose({
            assign,
        });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const handleUpdated = ({ data } : { data: string[] }) => {
            form.types = data;
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
    <AInputListForm
        :names="vuelidate.types.$model"
        :min-items="1"
        @changed="handleUpdated"
    >
        <template #label>
            Types
        </template>
    </AInputListForm>
</template>
