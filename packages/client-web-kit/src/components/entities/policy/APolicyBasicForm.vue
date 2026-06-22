<script lang="ts">
import {
    type PropType,
    computed,
    defineComponent,
    reactive,
    toRef,
    useId,
    watch,
} from 'vue';
import { useValidup } from '@validup/vue';
import {
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    assignFormProperties,
    injectStore,
    storeToRefs,
    useTranslations,
} from '../../../core';
import { ValidatorGroup, generateName } from '@authup/kit';
import type { Policy } from '@authup/core-kit';
import { PolicyValidator } from '@authup/core-kit';
import type { FormOption } from '@vuecs/forms';
import {
    VCFormGroup,
    VCFormInput,
    VCFormSwitch,
    VCFormTextarea,
} from '@vuecs/forms';
import { BuiltInPolicyType } from '@authup/access';
import { onChange, useIsEditing, useUpdatedAt } from '../../../composables';
import { ARealmPicker } from '../realm';
import { IFieldValidation } from '@ilingo/validup-vue';
import { ANameInput } from '../../utility';

export default defineComponent({
    components: {
        ANameInput,
        ARealmPicker,
        VCFormInput,
        VCFormSwitch,
        VCFormGroup,
        VCFormTextarea,

        IFieldValidation,
    },
    props: {
        entity: { type: Object as PropType<Policy> },
        type: { type: String as PropType<string | null>, default: undefined },
    },
    emits: ['updated'],
    setup(props, setup) {
        const entity = toRef(props, 'entity');
        const nameSeed = useId();
        const form = reactive({
            name: '',
            invert: false,
            display_name: '',
            description: '',
            realm_id: '',
            type: '',
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

        const typeOptions: FormOption[] = [
            ...Object.values(BuiltInPolicyType).map((type) => ({
                label: type,
                value: type,
            })),
        ];

        // Shared backend validator from @authup/core-kit. Registers
        // under the parent `<APolicyForm>` collector via `name: 'basic'`
        // so the parent extracts via `extractValidupResultsFromChild('basic')`.
        const v = useValidup(
            new PolicyValidator(),
            form,
            {
                name: 'basic',
                group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)),
            },
        );

        function assign(data: Partial<Policy> = {}) {
            assignFormProperties(form, data);
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        if (form.name.length === 0) {
            form.name = generateName(nameSeed);
        }

        // `type` is the policy discriminator owned by the parent
        // <APolicyForm>, not edited here. It's mounted (required on
        // CREATE) in the shared PolicyValidator, so feed the parent's
        // resolved value into the validated state — otherwise the basic
        // sub-form is permanently invalid and the submit button never
        // enables.
        watch(
            () => props.type,
            (value) => {
                form.type = value ?? '';
            },
            { immediate: true },
        );

        const handleUpdated = () => {
            setup.emit('updated', {
                data: form,
                valid: !v.$invalid.value,
            });
        };

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.DISPLAY_NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.DESCRIPTION,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.INVERT,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.REALM,
                count: 1,
            },
        ]);

        return {
            isEditing,
            realmId,
            handleUpdated,
            translationsDefault,
            typeOptions,
            v,
        };
    },
});
</script>
<template>
    <div class="flex flex-wrap -mx-2">
        <div class="flex-1 basis-0 px-2">
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.name"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.name }}
                    </template>
                    <ANameInput
                        :model-value="v.fields.name.$model.value"
                        @update:model-value="(next: string) => { v.fields.name.$model.value = next; handleUpdated(); }"
                    />
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.display_name"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.displayName }}
                    </template>
                    <VCFormInput
                        :model-value="v.fields.display_name.$model.value ?? ''"
                        @update:model-value="(next: string) => { v.fields.display_name.$model.value = next; }"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.description"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.description }}
                    </template>
                    <VCFormTextarea
                        :model-value="v.fields.description.$model.value ?? ''"
                        rows="4"
                        @update:model-value="(next: string) => { v.fields.description.$model.value = next; }"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.invert"
            >
                <VCFormGroup :validation="value">
                    <VCFormSwitch
                        v-model="v.fields.invert.$model.value"
                        :label="true"
                        @change="handleUpdated"
                    >
                        <template #label="iProps">
                            <label :for="iProps.id">
                                {{ translationsDefault.invert }}
                            </label>
                        </template>
                    </VCFormSwitch>
                </VCFormGroup>
            </IFieldValidation>
        </div>
        <div
            v-if="!realmId && !isEditing"
            class="flex-1 basis-0 px-2"
        >
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.realm_id"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.realm }}
                    </template>
                    <ARealmPicker
                        :value="v.fields.realm_id.$model.value"
                        @change="(value: string[]) => { v.fields.realm_id.$model.value = value.length > 0 ? value[0] ?? '' : ''; }"
                    />
                </VCFormGroup>
            </IFieldValidation>
        </div>
    </div>
</template>
