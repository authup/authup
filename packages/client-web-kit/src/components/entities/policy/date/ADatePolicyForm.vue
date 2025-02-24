<script lang="ts">
import {
    type PropType, defineComponent, reactive,
} from 'vue';
import useVuelidate from '@vuelidate/core';
import type { Policy } from '@authup/core-kit';
import { IVuelidate } from '@ilingo/vuelidate';
import { VCFormGroup, VCFormInput } from '@vuecs/form-controls';
import type { DatePolicy } from '@authup/access';
import { assignFormProperties } from '../../../../core';
import { onChange, useUpdatedAt } from '../../../../composables';

export default defineComponent({
    components: {
        VCFormInput,
        VCFormGroup,
        IVuelidate,
    },
    props: {
        entity: {
            type: Object as PropType<Partial<Policy>>,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            start: '',
            end: '',
        });

        const vuelidate = useVuelidate({
            start: {},
            end: {},
        }, form, {
            $registerAs: 'type',
        });

        function assign(data: Partial<DatePolicy> = {}) {
            assignFormProperties(form, data as Record<string, any>);
        }

        setup.expose({
            assign,
        });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const handleUpdated = () => {
            setup.emit('updated', {
                data: form,
                valid: !vuelidate.value.$invalid,
            });
        };

        return {
            handleUpdated,

            vuelidate,
        };
    },
});
</script>
<template>
    <div>
        <IVuelidate :validation="vuelidate.start">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Start
                    </template>
                    <VCFormInput
                        v-model="vuelidate.start.$model"
                        placeholder="YYYY-MM-DD"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <IVuelidate :validation="vuelidate.end">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        End
                    </template>
                    <VCFormInput
                        v-model="vuelidate.end.$model"
                        placeholder="YYYY-MM-DD"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
    </div>
</template>
