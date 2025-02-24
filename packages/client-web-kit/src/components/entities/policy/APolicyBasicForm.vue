<script lang="ts">
import {
    type PropType, computed, defineComponent, reactive, toRef,
} from 'vue';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { Policy } from '@authup/core-kit';
import { IVuelidate } from '@ilingo/vuelidate';
import type { FormSelectOption } from '@vuecs/form-controls';
import { VCFormGroup, VCFormInput, VCFormInputCheckbox } from '@vuecs/form-controls';
import { BuiltInPolicyType } from '@authup/access';
import { assignFormProperties, injectStore, storeToRefs } from '../../../core';
import { onChange, useIsEditing, useUpdatedAt } from '../../../composables';
import { ARealmPicker } from '../realm';

export default defineComponent({
    components: {
        ARealmPicker,
        VCFormInput,
        VCFormInputCheckbox,
        VCFormGroup,
        IVuelidate,
    },
    props: {
        entity: {
            type: Object as PropType<Policy>,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
        const entity = toRef(props, 'entity');
        const form = reactive({
            name: '',
            invert: false,
            display_name: '',
            description: '',
            realm_id: '',
        });

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const isEditing = useIsEditing(entity);
        const realmId = computed(() => {
            if (!storeRefs.realmIsRoot) {
                return storeRefs.realmId.value;
            }

            return entity.value ?
                entity.value.realm_id :
                null;
        });

        const typeOptions : FormSelectOption[] = [
            ...Object.values(BuiltInPolicyType).map((type) => ({ id: type, value: type })),
        ];

        const vuelidate = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
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
            assignFormProperties(form, data);
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
            isEditing,
            realmId,

            handleUpdated,
            typeOptions,
            vuelidate,
        };
    },
});
</script>
<template>
    <div class="row">
        <div class="col">
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
        <div
            v-if="!realmId && !isEditing"
            class="col"
        >
            <IVuelidate :validation="vuelidate.invert">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <template #label>
                            Realm
                        </template>
                        <ARealmPicker
                            :value="vuelidate.realm_id.$model"
                            @change="(value) => { vuelidate.realm_id.$model = value.length > 0 ? value[0] : ''; }"
                        />
                    </VCFormGroup>
                </template>
            </IVuelidate>
        </div>
    </div>
</template>
