<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Permission } from '@authup/core-kit';
import { EntityType, PermissionValidator } from '@authup/core-kit';
import { DecisionStrategy, ValidatorGroup, generateName } from '@authup/kit';
import { useValidup } from '@validup/vue';
import {
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
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
    watch,
} from 'vue';
import type { FormOption } from '@vuecs/forms';
import {
    VCFormGroup,
    VCFormInput,
    VCFormSelect,
    VCFormTextarea,
} from '@vuecs/forms';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    ANameInput,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealmPicker } from '../realm';
import { IFieldValidation } from '@ilingo/validup-vue';

function decisionStrategyHint(value: string): string {
    switch (value) {
        case DecisionStrategy.AFFIRMATIVE:
            return 'At least one policy must evaluate positively.';
        case DecisionStrategy.CONSENSUS:
            return 'More policies must evaluate positively than negatively.';
        case DecisionStrategy.UNANIMOUS:
            return 'All policies must evaluate positively.';
        default:
            return 'No strategy selected. Defaults to unanimous (all policies must evaluate positively).';
    }
}

export default defineComponent({
    components: {
        ANameInput,
        ARealmPicker,
        AFormSubmit,
        VCFormGroup,
        VCFormInput,
        VCFormSelect,
        VCFormTextarea,

        IFieldValidation,
    },
    props: { entity: { type: Object as PropType<Permission> } },
    emits: defineEntityVEmitOptions<Permission>(),
    setup(props, ctx) {
        const busy = ref(false);

        const form = reactive({
            name: '',
            display_name: '',
            description: '',
            decision_strategy: '',
            realm_id: '',
        });

        const decisionStrategyOptions: FormOption[] = Object.values(DecisionStrategy)
            .map((value) => ({ label: value, value }));

        const manager = defineEntityManager({
            type: `${EntityType.PERMISSION}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        // `decision_strategy: ''` is the form's "no selection" sentinel
        // (submitted as `null`); excess-property checks reject it against the
        // entity's DecisionStrategy union, so we narrow to Partial<Permission>.
        const v = useValidup(
            new PermissionValidator(),
            form as Partial<Permission>,
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
        const isBuiltIn = computed(() => !!(manager.data.value && manager.data.value.built_in));

        function initForm() {
            assignFormProperties(form, manager.data.value);

            if (form.name.length === 0) {
                form.name = generateName();
            }

            if (realmId.value) {
                form.realm_id = realmId.value;
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
            if (busy.value || v.$invalid.value) {
                return;
            }

            busy.value = true;
            try {
                const data: Record<string, unknown> = {
                    ...form,
                    decision_strategy: form.decision_strategy || null,
                };

                await manager.createOrUpdate(data);
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
                    key: TranslatorTranslationFieldKey.DISPLAY_NAME,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.DESCRIPTION,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.DECISION_STRATEGY,
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY,
                    key: TranslatorTranslationEntityKey.REALM,
                    count: 1,
                },
            ],
        );

        const decisionStrategyHintComputed = computed(() => decisionStrategyHint(form.decision_strategy));

        return {
            busy,
            v,
            isEditing,
            isBuiltIn,
            realmId,
            decisionStrategyOptions,
            decisionStrategyHint: decisionStrategyHintComputed,
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
                    :disabled="isBuiltIn"
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

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.decision_strategy"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translationsDefault.decisionStrategy }}
                </template>
                <VCFormSelect
                    v-model="v.fields.decision_strategy.$model.value"
                    :options="decisionStrategyOptions"
                    placeholder="-- None (default: unanimous) --"
                />
                <div class="alert alert-sm alert-info mt-1 mb-0">
                    {{ decisionStrategyHint }}
                </div>
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
                        :multiple="false"
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
