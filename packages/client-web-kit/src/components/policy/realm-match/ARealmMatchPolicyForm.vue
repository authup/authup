<script lang="ts">
import {
    type PropType, defineComponent, reactive,
} from 'vue';
import useVuelidate from '@vuelidate/core';
import type { Policy } from '@authup/core-kit';
import { IVuelidate } from '@ilingo/vuelidate';
import { VCFormGroup } from '@vuecs/form-controls';
import type { RealmMatchPolicy } from '@authup/access';
import { extendObjectProperties } from '../../../core';
import { onChange, useUpdatedAt } from '../../../composables';
import AFormInputList from '../../utility/AFormInputList.vue';

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
            attributeNameStrict: false,
            attributeNullMatchAll: false,
            identityMasterMatchAll: false,
            attributeName: [],
        });

        const vuelidate = useVuelidate({
            attributeNameStrict: {},
            attributeNullMatchAll: {},
            identityMasterMatchAll: {},
            attributeName: {},
        }, form, {
            $registerAs: 'type',
        });

        function assign(input: Partial<RealmMatchPolicy> = {}) {
            const { attributeName, ...data } = input;
            extendObjectProperties(form, data as Record<string, any>);
            if (attributeName) {
                form.attributeName = typeof attributeName === 'string' ? [attributeName] : attributeName;
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

        return {
            handleUpdated,

            vuelidate,
        };
    },
});
</script>
<template>
    <div class="row">
        <div class="col-7">
            <IVuelidate :validation="vuelidate.attributeName">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <AFormInputList
                            :names="vuelidate.attributeName.$model"
                            @changed="handleUpdated"
                        />
                    </VCFormGroup>
                </template>
            </IVuelidate>
        </div>
        <div class="col-5">
            <IVuelidate :validation="vuelidate.attributeNameStrict">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <VCFormInputCheckbox
                            v-model="vuelidate.attributeNameStrict.$model"
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
            <IVuelidate :validation="vuelidate.attributeNullMatchAll">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <VCFormInputCheckbox
                            v-model="vuelidate.attributeNullMatchAll.$model"
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
            <IVuelidate :validation="vuelidate.identityMasterMatchAll">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <VCFormInputCheckbox
                            v-model="vuelidate.identityMasterMatchAll.$model"
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
