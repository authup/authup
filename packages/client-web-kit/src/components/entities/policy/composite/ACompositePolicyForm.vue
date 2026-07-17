<script lang="ts">
import type { BuildInput, FiltersBuildInput } from 'rapiq';
import {
    type PropType,
    computed,
    defineComponent,
    reactive,
} from 'vue';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { Policy } from '@authup/core-kit';
import { DecisionStrategy } from '@authup/kit';
import type { FormOption } from '@vuecs/forms';
import { VCFormGroup, VCFormSelect } from '@vuecs/forms';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslations } from '../../../../core';
import { onChange, useUpdatedAt } from '../../../../composables';
import APolicyPicker from '../APolicyPicker.vue';
import { VCAlert } from '@vuecs/elements';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        APolicyChildrenPicker: APolicyPicker,
        VCFormGroup,
        VCFormSelect,
        VCAlert,

        IFieldValidation,
    },
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive<{ items: string[], decisionStrategy: string }>({
            items: [],
            decisionStrategy: '',
        });

        const decisionStrategyOptions: FormOption[] = Object.values(DecisionStrategy)
            .map((value) => ({
                label: value,
                value,
            }));

        const id = computed(() => {
            if (!props.entity) {
                return undefined;
            }
            return props.entity.id;
        });

        const v = useValidup(new Container<typeof form>(), form, { name: 'type' });

        const query = computed<BuildInput<Policy & { parentId?: string | null }>>(() => {
            const filters: FiltersBuildInput<Policy & { parentId?: string | null }> = {};
            if (props.entity) {
                // todo: maybe respect manual realmId component prop
                if (props.entity.realmId) {
                    filters.realmId = props.entity.realmId;
                }

                if (props.entity.parentId) {
                    filters.id = [
                        `!${props.entity.id}`,
                        `!${props.entity.parentId}`,
                    ];
                } else {
                    filters.id = `!${props.entity.id}`;
                }

                filters.parentId = [null, `${props.entity.id}`];
            } else {
                filters.parentId = null;
            }

            return {
                filters,
                sort: { name: 'ASC' },
            };
        });

        function assign(data: Partial<Policy> = {}) {
            if (data.children) {
                form.items = data.children
                    .map((child) => child.id)
                    .filter((id): id is string => !!id);
            } else {
                form.items = [];
            }

            const record = data as Record<string, unknown>;
            if (typeof record.decisionStrategy === 'string') {
                form.decisionStrategy = record.decisionStrategy;
            } else {
                form.decisionStrategy = '';
            }
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(() => props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const emitUpdated = () => {
            setup.emit('updated', {
                data: [...form.items],
                decisionStrategy: form.decisionStrategy || undefined,
                valid: !v.$invalid.value,
            });
        };

        const handleUpdated = (children: string[]) => {
            form.items = children;
            emitUpdated();
        };

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.DECISION_STRATEGY,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CHILDREN,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.OPTION_NONE_UNANIMOUS,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_AFFIRMATIVE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_CONSENSUS,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_UNANIMOUS,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_DEFAULT,
            },
        ]);

        const decisionStrategyHint = computed(() => {
            switch (form.decisionStrategy) {
                case DecisionStrategy.AFFIRMATIVE:
                    return translations.decisionStrategyHintAffirmative;
                case DecisionStrategy.CONSENSUS:
                    return translations.decisionStrategyHintConsensus;
                case DecisionStrategy.UNANIMOUS:
                    return translations.decisionStrategyHintUnanimous;
                default:
                    return translations.decisionStrategyHintDefault;
            }
        });

        const handleDecisionStrategyUpdated = () => {
            emitUpdated();
        };

        return {
            id,
            handleUpdated,
            handleDecisionStrategyUpdated,
            decisionStrategyHint,
            decisionStrategyOptions,
            translations,
            v,
            query,
        };
    },
});
</script>
<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.decisionStrategy"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.decisionStrategy }}
                </template>
                <VCFormSelect
                    v-model="v.fields.decisionStrategy.$model.value"
                    :options="decisionStrategyOptions"
                    :placeholder="translations.optionNoneUnanimous"
                    @update:model-value="handleDecisionStrategyUpdated"
                />
                <VCAlert
                    color="info"
                    variant="soft"
                    size="sm"
                    class="mt-1 mb-0"
                >
                    {{ decisionStrategyHint }}
                </VCAlert>
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.items"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.children }}
                </template>
                <APolicyChildrenPicker
                    :parent-id="id"
                    :query="query"
                    :value="v.fields.items.$model.value"
                    @change="handleUpdated"
                />
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
