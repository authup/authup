<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { ValidatorGroup, generateName } from '@authup/kit';
import { useValidup } from '@validup/vue';
import {
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
    assignFormProperties,
    useTranslations,
} from '../../../core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    watch,
} from 'vue';
import type { Realm } from '@authup/core-kit';
import { EntityType, REALM_MASTER_NAME, RealmValidator } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormTextarea } from '@vuecs/forms';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';
import {
    AFormSubmit,
    ANameInput,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';

export const ARealmForm = defineComponent({
    components: {
        AFormSubmit,
        ANameInput,
        VCFormGroup,
        VCFormInput,
        VCFormTextarea,

        IFieldValidation,
    },
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: false,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<Realm>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
            description: '',
        });

        const manager = defineEntityManager({
            type: `${EntityType.REALM}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const v = useValidup(
            new RealmValidator(),
            form,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const updatedAt = useUpdatedAt(props.entity);
        const isMaster = computed(() => manager.data.value &&
            manager.data.value.name === REALM_MASTER_NAME);

        function initForm() {
            assignFormProperties(form, manager.data.value);

            if (form.name.length === 0) {
                form.name = generateName();
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
                    as: 'name', 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.DISPLAY_NAME, 
                    as: 'displayName', 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.DESCRIPTION, 
                    as: 'description', 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.REALM, 
                    count: 1, 
                    as: 'realm', 
                },
            ],
        );

        return {
            busy,
            v,
            isEditing,
            isMaster,
            translationsDefault,
            submit,
        };
    },
});

export default ARealmForm;
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
                    :disabled="isMaster"
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
                    :rows="4"
                    @update:model-value="(next: string) => { v.fields.description.$model.value = next; }"
                />
            </VCFormGroup>
        </IFieldValidation>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="v.$invalid.value"
            @submit="submit"
        />
    </form>
</template>
