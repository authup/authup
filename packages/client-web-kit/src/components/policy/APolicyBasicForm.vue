<script lang="ts">
import { type PropType, defineComponent, reactive } from 'vue';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { Policy } from '@authup/core-kit';
import { IVuelidate } from '@ilingo/vuelidate';
import type { FormSelectOption } from '@vuecs/form-controls';
import { VCFormGroup, VCFormInput, VCFormInputCheckbox } from '@vuecs/form-controls';
import { BuiltInPolicyType } from '@authup/access';
import { extendObjectProperties } from '../../core';
import { onChange, useUpdatedAt } from '../../composables';

export default defineComponent({
    components: {
        VCFormInput,
        VCFormInputCheckbox,
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
            name: '',
            invert: false,
            display_name: '',
            description: '',
            realm_id: '',
        });

        const typeOptions : FormSelectOption[] = [
            ...Object.values(BuiltInPolicyType).map((type) => ({ id: type, value: type })),
        ];

        const vuelidate = useVuelidate({
            name: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(128),
            },
            invert: {

            },
            display_name: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
            realm_id: {

            },
        }, form, {
            $registerAs: 'basic',
        });

        function assign(data: Partial<Policy> = {}) {
            extendObjectProperties(form, data);
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
            typeOptions,
            vuelidate,
        };
    },
});
</script>
<template>
    <div>
        <IVuelidate :validation="vuelidate.name">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Name
                    </template>
                    <VCFormInput
                        v-model="vuelidate.name.$model"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.display_name">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Display Name
                    </template>
                    <VCFormInput
                        v-model="vuelidate.display_name.$model"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.description">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Description
                    </template>
                    <VCFormTextarea
                        v-model="vuelidate.description.$model"
                        rows="4"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.invert">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <VCFormInputCheckbox
                        v-model="vuelidate.invert.$model"
                        :group-class="'form-switch'"
                        :label="true"
                        @change="handleUpdated"
                    >
                        <template #label="iProps">
                            <label :for="iProps.id">
                                Invert?
                            </label>
                        </template>
                    </VCFormInputCheckbox>
                </VCFormGroup>
            </template>
        </IVuelidate>
    </div>
</template>
