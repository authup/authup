<script lang="ts">
import { type PropType,defineComponent,reactive, } from 'vue';
import useVuelidate from '@vuelidate/core';
import type { Policy } from '@authup/core-kit';
import { IVuelidate } from '@ilingo/vuelidate';
import { VCFormGroup } from '@vuecs/form-controls';
import type { RealmMatchPolicy } from '@authup/access';
import { assignFormProperties } from '../../../../core';
import { onChange, useUpdatedAt } from '../../../../composables';
import AFormInputList from '../../../utility/form-input-list/AFormInputList.vue';

export default defineComponent({
    components: {
        AFormInputList,
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
            attribute_name_strict: false,
            attribute_null_match_all: false,
            identity_master_match_all: false,
            attribute_name: [] as string[],
        });

        const vuelidate = useVuelidate({
            attribute_name_strict: {},
            attribute_null_match_all: {},
            identity_master_match_all: {},
            attribute_name: {},
        }, form, {
            $registerAs: 'type',
        });

        function assign(input: Partial<RealmMatchPolicy> = {}) {
            const {
                attribute_name, 
                ...data 
            } = input;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            assignFormProperties(form, data as Record<string, any>);
            if (attribute_name) {
                form.attribute_name = typeof attribute_name === 'string' ? [attribute_name] : attribute_name;
            } else {
                form.attribute_name = [];
            }
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

        const handleAttributeNameChanged = (data: string[]) => {
            form.attribute_name = data;
            handleUpdated();
        };

        return {
            handleUpdated,
            handleAttributeNameChanged,

            vuelidate,
        };
    },
});
</script>
<template>
    <div class="row">
        <div class="col-7">
            <IVuelidate :validation="vuelidate.attribute_name">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <AFormInputList
                            :names="vuelidate.attribute_name.$model"
                            @changed="handleAttributeNameChanged"
                        />
                    </VCFormGroup>
                </template>
            </IVuelidate>
        </div>
        <div class="col-5">
            <IVuelidate :validation="vuelidate.attribute_name_strict">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <VCFormInputCheckbox
                            v-model="vuelidate.attribute_name_strict.$model"
                            :group-class="'form-switch'"
                            :label="true"
                            @change="handleUpdated"
                        >
                            <template #label="iProps">
                                <label :for="iProps.id">
                                    Only match if the attribute is strict equal to the name?
                                </label>
                            </template>
                        </VCFormInputCheckbox>
                    </VCFormGroup>
                </template>
            </IVuelidate>
            <IVuelidate :validation="vuelidate.attribute_null_match_all">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <VCFormInputCheckbox
                            v-model="vuelidate.attribute_null_match_all.$model"
                            :group-class="'form-switch'"
                            :label="true"
                            @change="handleUpdated"
                        >
                            <template #label="iProps">
                                <label :for="iProps.id">
                                    Determines if resources with null realm-id/name value should match all identity realms.<br>
                                    If true, any identity realm can access resources with null realm-id/name values.
                                </label>
                            </template>
                        </VCFormInputCheckbox>
                    </VCFormGroup>
                </template>
            </IVuelidate>
            <IVuelidate :validation="vuelidate.identity_master_match_all">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <VCFormInputCheckbox
                            v-model="vuelidate.identity_master_match_all.$model"
                            :group-class="'form-switch'"
                            :label="true"
                            @change="handleUpdated"
                        >
                            <template #label="iProps">
                                <label :for="iProps.id">
                                    Specifies whether the master realm of an identity should match all realm-id/name attributes, including null.<br>
                                    If true, the master realm can access any resource regardless of its realm value.
                                </label>
                            </template>
                        </VCFormInputCheckbox>
                    </VCFormGroup>
                </template>
            </IVuelidate>
        </div>
    </div>
</template>
