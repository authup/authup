<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { EntityType, RoleValidator } from '@authup/core-kit';
import { ValidatorGroup } from '@authup/kit';
import { useValidup } from '@validup/vue';
import { 
    TranslatorTranslationDefaultKey, 
    TranslatorTranslationNamespace, 
    assignFormProperties, 
    injectStore, 
    storeToRefs, 
    useTranslationsForNamespace, 
} from '../../../core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    watch,
} from 'vue';
import type { Role } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormTextarea } from '@vuecs/forms';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealmPicker } from '../realm';
import { IFieldValidation } from '@ilingo/validup-vue';

export const ARoleForm = defineComponent({
    components: {
        ARealmPicker,
        AFormSubmit,
        VCFormGroup,
        VCFormInput,
        VCFormTextarea,

        IFieldValidation,
    },
    props: {
        entity: {
            type: Object as PropType<Role>,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<Role>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
            description: '',
            realm_id: '',
        });

        const manager = defineEntityManager({
            type: `${EntityType.ROLE}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        // Shared `RoleValidator` from `@authup/core-kit` — same instance
        // the server-core provisioning service runs. `group` is reactive
        // so the validator switches between `CREATE` (strict) and
        // `UPDATE` (every field optional) when the form flips between
        // create and edit modes.
        const v = useValidup(
            new RoleValidator(),
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

        function initForm() {
            assignFormProperties(form, manager.data.value);
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

        const translationsDefault = useTranslationsForNamespace(
            TranslatorTranslationNamespace.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
                { key: TranslatorTranslationDefaultKey.REALM },
            ],
        );

        return {
            busy,
            v,
            isEditing,
            realmId,
            translationsDefault,
            submit,
        };
    },
});

export default ARoleForm;
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
                <VCFormInput v-model="v.fields.name.$model.value" />
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
                    :rows="6"
                    @update:model-value="(next: string) => { v.fields.description.$model.value = next; }"
                />
            </VCFormGroup>
        </IFieldValidation>

        <template v-if="!realmId && !isEditing">
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
