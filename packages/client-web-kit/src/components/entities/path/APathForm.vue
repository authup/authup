<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Path } from '@authup/core-kit';
import { EntityType, PathValidator } from '@authup/core-kit';
import { ValidatorGroup } from '@authup/kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { defineQuery } from '@rapiq/core';
import { useValidup } from '@validup/vue';
import { IFieldValidation } from '@ilingo/validup-vue';
import { VCFormGroup, VCFormInput, VCFormTextarea } from '@vuecs/forms';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    watch,
} from 'vue';
import {
    assignFormProperties,
    injectStore,
    storeToRefs,
    useTranslations,
    useTranslationsForNamespace,
} from '../../../core';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    ANameInput,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealmPicker } from '../realm';
import { APathPicker } from './APathPicker';

export default defineComponent({
    components: {
        AFormSubmit,
        ANameInput,
        APathPicker,
        ARealmPicker,
        VCFormGroup,
        VCFormInput,
        VCFormTextarea,

        IFieldValidation,
    },
    props: {
        entity: { type: Object as PropType<Path> },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<Path>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            parentId: null as string | null,
            displayName: '',
            description: '',
            realmId: '',
        });

        const manager = defineEntityManager({
            type: EntityType.PATH,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const v = useValidup(
            new PathValidator(),
            form as Partial<Path>,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const realmLock = computed(() => {
            if (props.realmId) {
                return props.realmId;
            }

            if (!storeRefs.realmIsRoot.value) {
                return storeRefs.realmId.value;
            }

            return manager.data.value ?
                manager.data.value.realmId :
                null;
        });

        // The realm the parent picker scopes to, '' while a create form has
        // none yet. That empty value is what hides the picker: there are no
        // global folders, so an unscoped query would ask for `realmId = ''`
        // against a uuid column.
        const resolvedRealmId = computed<string>(() => realmLock.value ||
            form.realmId ||
            '');

        // A folder lives in one realm, so the parent may only be picked from
        // that realm's tree.
        const parentQuery = computed(() => defineQuery<Path>({ filters: { realmId: [resolvedRealmId.value] } }));

        const updatedAt = useUpdatedAt(() => props.entity);

        function initForm() {
            assignFormProperties(form, manager.data.value, { fields: v.fields });

            if (props.realmId) {
                form.realmId = props.realmId;
            }
        }

        watch(updatedAt, (val, oldVal) => {
            if (!val || val === oldVal) {
                return;
            }

            manager.data.value = props.entity;
            initForm();
        });

        initForm();

        // A folder can not be its own parent, and the picker lists the whole
        // realm tree, so the record itself is dropped here rather than
        // filtered out of the query.
        const setParent = (input: string[]) => {
            const next = input.length > 0 ? input[0] ?? null : null;

            if (
                next &&
                manager.data.value &&
                next === manager.data.value.id
            ) {
                return;
            }

            v.fields.parentId.$model.value = next;
        };

        const submit = async () => {
            if (busy.value || v.$invalid.value) {
                return;
            }

            busy.value = true;
            try {
                // the realm sentinel ('' = unset) widens realmId beyond the
                // entity's own type, so narrow for the manager call.
                await manager.createOrUpdate(form as Partial<Path>);
            } finally {
                busy.value = false;
            }
        };

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.NAME,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.PARENT,
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

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.PATH_HINT },
            ],
        );

        return {
            busy,
            v,
            isEditing,
            realmLock,
            parentQuery,
            resolvedRealmId,
            translationsApp,
            translationsDefault,
            setParent,
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
                />
            </VCFormGroup>
        </IFieldValidation>

        <!-- folders are realm bound, so the picker waits for a realm -->
        <IFieldValidation
            v-if="resolvedRealmId"
            v-slot="{ value }"
            :field="v.fields.parentId"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translationsDefault.parent }}
                </template>
                <template #default>
                    <APathPicker
                        :value="v.fields.parentId.$model.value ?? ''"
                        :query="parentQuery"
                        @change="setParent"
                    />
                </template>
                <template #hint>
                    {{ translationsApp.pathHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.displayName"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translationsDefault.displayName }}
                </template>
                <VCFormInput
                    :model-value="v.fields.displayName.$model.value ?? ''"
                    @update:model-value="(next: string) => { v.fields.displayName.$model.value = next; }"
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
                    :rows="5"
                    @update:model-value="(next: string) => { v.fields.description.$model.value = next; }"
                />
            </VCFormGroup>
        </IFieldValidation>

        <template v-if="!isEditing && !realmLock">
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.realmId"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.realm }}
                    </template>
                    <ARealmPicker
                        :value="v.fields.realmId.$model.value"
                        @change="(input: string[]) => {
                            v.fields.realmId.$model.value = input.length > 0 ? input[0] ?? '' : '';
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
