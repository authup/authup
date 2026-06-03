<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Permission } from '@authup/core-kit';
import { EntityType, PermissionValidator } from '@authup/core-kit';
import { DecisionStrategy, ValidatorGroup } from '@authup/kit';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
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
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    assignFormProperties,
    injectStore,
    storeToRefs,
    useTranslationsForGroup,
} from '../../../core';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealmPicker } from '../realm';

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

export const APermissionForm = defineComponent({
    components: {
        ARealmPicker,
        AFormSubmit,
        VCFormGroup,
        VCFormInput,
        VCFormSelect,
        VCFormTextarea,
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

        const $v = useValidup(
            new PermissionValidator(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            form as any,
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
            if (busy.value || $v.$invalid.value) {
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

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
                { key: TranslatorTranslationDefaultKey.DECISION_STRATEGY },
                { key: TranslatorTranslationDefaultKey.REALM },
            ],
        );

        const decisionStrategyHintComputed = computed(() => decisionStrategyHint(form.decision_strategy));

        return {
            busy,
            $v,
            isEditing,
            isBuiltIn,
            realmId,
            decisionStrategyOptions,
            decisionStrategyHint: decisionStrategyHintComputed,
            translationsDefault,
            submit,
            useFieldValidation,
        };
    },
});

export default APermissionForm;
</script>

<template>
    <form @submit.prevent="submit">
        <VCFormGroup :validation="useFieldValidation($v.fields.name!)">
            <template #label>
                {{ translationsDefault.name }}
            </template>
            <VCFormInput
                v-model="$v.fields.name!.$model.value"
                :disabled="isBuiltIn"
            />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation($v.fields.display_name!)">
            <template #label>
                {{ translationsDefault.displayName }}
            </template>
            <VCFormInput v-model="$v.fields.display_name!.$model.value" />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation($v.fields.description!)">
            <template #label>
                {{ translationsDefault.description }}
            </template>
            <VCFormTextarea
                v-model="$v.fields.description!.$model.value"
                :rows="4"
            />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation($v.fields.decision_strategy!)">
            <template #label>
                {{ translationsDefault.decisionStrategy }}
            </template>
            <VCFormSelect
                v-model="$v.fields.decision_strategy!.$model.value"
                :options="decisionStrategyOptions"
                :option-default="true"
                option-default-value="-- None (default: unanimous) --"
            />
            <div class="alert alert-sm alert-info mt-1 mb-0">
                {{ decisionStrategyHint }}
            </div>
        </VCFormGroup>

        <template v-if="!realmId && !isEditing">
            <VCFormGroup :validation="useFieldValidation($v.fields.realm_id!)">
                <template #label>
                    {{ translationsDefault.realm }}
                </template>
                <ARealmPicker
                    :value="$v.fields.realm_id!.$model.value"
                    :multiple="false"
                    @change="(input: string[]) => {
                        $v.fields.realm_id!.$model.value = input.length > 0 ? input[0] ?? '' : '';
                    }"
                />
            </VCFormGroup>
        </template>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="$v.$invalid.value"
            @submit="submit"
        />
    </form>
</template>
