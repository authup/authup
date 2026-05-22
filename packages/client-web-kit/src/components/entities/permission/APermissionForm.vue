<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Permission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { DecisionStrategy } from '@authup/kit';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    watch,
} from 'vue';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { FormOption } from '@vuecs/forms';
import {
    VCFormGroup,
    VCFormInput,
    VCFormSelect,
    VCFormTextarea,
} from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    VuelidateCustomRule,
    VuelidateCustomRuleKey,
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
        IVuelidate,
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

        const $v = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
                [VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT]: VuelidateCustomRule[
                    VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT
                ],
            },
            display_name: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
            decision_strategy: {},
            realm_id: {},
        }, form);

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const manager = defineEntityManager({
            type: `${EntityType.PERMISSION}`,
            setup: ctx,
            props,
        });

        const realmId = computed(() => {
            if (!storeRefs.realmIsRoot) {
                return storeRefs.realmId.value;
            }

            return manager.data.value ?
                manager.data.value.realm_id :
                null;
        });

        const isEditing = useIsEditing(manager.data);
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
            if ($v.value.$invalid) {
                return;
            }

            const data: Record<string, unknown> = {
                ...form,
                decision_strategy: form.decision_strategy || null,
            };

            await manager.createOrUpdate(data);
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
            vuelidate: $v,
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

export default APermissionForm;
</script>

<template>
    <form @submit.prevent="submit">
        <IVuelidate :validation="vuelidate.name">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        {{ translationsDefault.name }}
                    </template>
                    <VCFormInput
                        v-model="vuelidate.name.$model"
                        :disabled="isBuiltIn"
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
                        {{ translationsDefault.displayName }}
                    </template>
                    <VCFormInput v-model="vuelidate.display_name.$model" />
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
                        {{ translationsDefault.description }}
                    </template>
                    <VCFormTextarea
                        v-model="vuelidate.description.$model"
                        :rows="4"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <IVuelidate :validation="vuelidate.decision_strategy">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        {{ translationsDefault.decisionStrategy }}
                    </template>
                    <VCFormSelect
                        v-model="vuelidate.decision_strategy.$model"
                        :options="decisionStrategyOptions"
                        :option-default="true"
                        option-default-value="-- None (default: unanimous) --"
                    />
                    <div class="alert alert-sm alert-info mt-1 mb-0">
                        {{ decisionStrategyHint }}
                    </div>
                </VCFormGroup>
            </template>
        </IVuelidate>

        <template v-if="!realmId && !isEditing">
            <IVuelidate :validation="vuelidate.realm_id">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <template #label>
                            {{ translationsDefault.realm }}
                        </template>
                        <ARealmPicker
                            :value="vuelidate.realm_id.$model"
                            :multiple="false"
                            @change="(input: string[]) => {
                                vuelidate.realm_id.$model = input.length > 0 ? input[0] ?? '' : '';
                            }"
                        />
                    </VCFormGroup>
                </template>
            </IVuelidate>
        </template>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="vuelidate.$invalid"
            @submit="submit"
        />
    </form>
</template>
