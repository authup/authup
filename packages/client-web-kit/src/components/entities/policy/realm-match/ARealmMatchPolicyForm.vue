<script lang="ts">
import { type PropType, defineComponent, reactive } from 'vue';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { ITranslateT } from '@ilingo/vue';
import { assignFormProperties, useTranslationsForNamespace } from '../../../../core';
import type { Policy } from '@authup/core-kit';
import { VCFormGroup, VCFormSwitch } from '@vuecs/forms';
import type { RealmMatchPolicy } from '@authup/access';
import { onChange, useUpdatedAt } from '../../../../composables';
import AFormInputList from '../../../utility/form-input-list/AFormInputList.vue';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        AFormInputList,
        VCFormGroup,
        VCFormSwitch,

        IFieldValidation,
        ITranslateT,
    },
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            attribute_name_strict: false,
            attribute_null_match_all: false,
            identity_master_match_all: false,
            attribute_name: [] as string[],
        });

        const v = useValidup(new Container<typeof form>(), form, { name: 'type' });

        function assign(input: Partial<RealmMatchPolicy> = {}) {
            const { attribute_name, ...data } = input;
            assignFormProperties(form, data as Record<string, unknown>);
            if (attribute_name) {
                form.attribute_name = typeof attribute_name === 'string' ? [attribute_name] : attribute_name;
            } else {
                form.attribute_name = [];
            }
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const handleUpdated = () => {
            setup.emit('updated', {
                data: form,
                valid: !v.$invalid.value,
            });
        };

        const handleAttributeNameChanged = (data: string[]) => {
            form.attribute_name = data;
            handleUpdated();
        };

        const translations = useTranslationsForNamespace(
            TranslatorTranslationNamespace.CLIENT,
            [
                { key: TranslatorTranslationClientKey.REALM_MATCH_STRICT_HINT },
            ],
        );

        return {
            handleUpdated,
            handleAttributeNameChanged,
            translations,
            v,
        };
    },
});
</script>
<template>
    <div class="flex flex-wrap -mx-2">
        <div class="w-7/12 px-2">
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.attribute_name"
            >
                <VCFormGroup :validation="value">
                    <AFormInputList
                        :names="v.fields.attribute_name.$model.value"
                        @changed="handleAttributeNameChanged"
                    />
                </VCFormGroup>
            </IFieldValidation>
        </div>
        <div class="w-5/12 px-2">
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.attribute_name_strict"
            >
                <VCFormGroup :validation="value">
                    <VCFormSwitch
                        v-model="v.fields.attribute_name_strict.$model.value"
                        :label="true"
                        @change="handleUpdated"
                    >
                        <template #label="iProps">
                            <label :for="iProps.id">
                                {{ translations.realmMatchStrictHint }}
                            </label>
                        </template>
                    </VCFormSwitch>
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.attribute_null_match_all"
            >
                <VCFormGroup :validation="value">
                    <VCFormSwitch
                        v-model="v.fields.attribute_null_match_all.$model.value"
                        :label="true"
                        @change="handleUpdated"
                    >
                        <template #label="iProps">
                            <label :for="iProps.id">
                                <ITranslateT path="authupClient.realmMatchNullMatchAllHint">
                                    <template #br>
                                        <br>
                                    </template>
                                </ITranslateT>
                            </label>
                        </template>
                    </VCFormSwitch>
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.identity_master_match_all"
            >
                <VCFormGroup :validation="value">
                    <VCFormSwitch
                        v-model="v.fields.identity_master_match_all.$model.value"
                        :label="true"
                        @change="handleUpdated"
                    >
                        <template #label="iProps">
                            <label :for="iProps.id">
                                <ITranslateT path="authupClient.realmMatchMasterMatchAllHint">
                                    <template #br>
                                        <br>
                                    </template>
                                </ITranslateT>
                            </label>
                        </template>
                    </VCFormSwitch>
                </VCFormGroup>
            </IFieldValidation>
        </div>
    </div>
</template>
