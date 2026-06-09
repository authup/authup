<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { EntityType, ScopeValidator } from '@authup/core-kit';
import { ValidatorGroup, generateName } from '@authup/kit';
import { useValidup } from '@validup/vue';
import { TranslatorTranslationEntityKey, TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { 
    assignFormProperties, 
    injectStore, 
    storeToRefs, 
    useTranslations, 
} from '../../../core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    useId,
    watch,
} from 'vue';
import type { Scope } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormTextarea } from '@vuecs/forms';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    ANameInput,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealmPicker } from '../realm';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        ANameInput,
        ARealmPicker,
        AFormSubmit,
        VCFormGroup,
        VCFormInput,
        VCFormTextarea,

        IFieldValidation,
    },
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: { type: Object as PropType<Scope> },
    },
    emits: defineEntityVEmitOptions<Scope>(),
    setup(props, ctx) {
        const busy = ref(false);
        const nameSeed = useId();
        const form = reactive({
            name: '',
            display_name: '',
            description: '',
            realm_id: '',
        });

        const manager = defineEntityManager({
            type: `${EntityType.SCOPE}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const v = useValidup(
            new ScopeValidator(),
            form,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const realmId = computed(() => {
            if (!storeRefs.realmIsRoot) {
                return storeRefs.realmId.value;
            }

            return manager.data.value ?
                manager.data.value.realm_id :
                null;
        });

        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed<boolean>(() => {
            if (!!props.name && props.name.length > 0) {
                return true;
            }

            return !!(manager.data.value && manager.data.value.built_in);
        });

        function initForm() {
            if (props.name) {
                form.name = props.name;
            }

            assignFormProperties(form, manager.data.value);

            if (form.name.length === 0) {
                form.name = generateName(nameSeed);
            }
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                manager.data.value = props.entity;
                initForm();
            }
        });

        initForm();

        const submit = async () => {
            if (v.$invalid.value) {
                return;
            }

            await manager.createOrUpdate(form);
        };

        const translationsDefault = useTranslations(
            [
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
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.REALM, 
                    count: 1, 
                },
            ],
        );

        return {
            busy,
            v,
            isEditing,
            realmId,
            isNameFixed,
            translationsDefault,
            submit,
        };
    },
});

</script>

<template>
    <form @submit.prevent="submit">
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.name"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translationsDefault.name }}
                </template>
                <ANameInput
                    v-model="v.fields.name.$model.value"
                    :disabled="isNameFixed"
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
                    :rows="7"
                    @update:model-value="(next: string) => { v.fields.description.$model.value = next; }"
                />
            </VCFormGroup>
        </IFieldValidation>

        <template v-if="!realmId && !isNameFixed && !isEditing">
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
                        @change="(input: string[]) => {
                            v.fields.realm_id.$model.value = input.length > 0 ? input[0] ?? '' : '';
                        }"
                    />
                </VCFormGroup>
            </IFieldValidation>
        </template>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="v.$invalid.value"
            @submit="submit"
        />
    </form>
</template>
