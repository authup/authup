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
import { useFieldValidation } from '@ilingo/validup-vue';
import type { Policy } from '@authup/core-kit';
import { DecisionStrategy } from '@authup/kit';
import type { FormOption } from '@vuecs/forms';
import { VCFormGroup, VCFormSelect } from '@vuecs/forms';
import { onChange, useUpdatedAt } from '../../../../composables';
import APolicyPicker from '../APolicyPicker.vue';

export default defineComponent({
    components: {
        APolicyChildrenPicker: APolicyPicker,
        VCFormGroup,
        VCFormSelect,
    },
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive<{ items: string[], decision_strategy: string }>({
            items: [],
            decision_strategy: '',
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

        const $v = useValidup(new Container<typeof form>(), form, { name: 'type' });

        const query = computed<BuildInput<Policy & { parent_id?: string | null }>>(() => {
            const filters: FiltersBuildInput<Policy & { parent_id?: string | null }> = {};
            if (props.entity) {
                // todo: maybe respect manual realmId component prop
                if (props.entity.realm_id) {
                    filters.realm_id = props.entity.realm_id;
                }

                if (props.entity.parent_id) {
                    filters.id = [
                        `!${props.entity.id}`,
                        `!${props.entity.parent_id}`,
                    ];
                } else {
                    filters.id = `!${props.entity.id}`;
                }

                filters.parent_id = [null, `${props.entity.id}`];
            } else {
                filters.parent_id = null;
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

            const record = data as Record<string, any>;
            if (record.decision_strategy) {
                form.decision_strategy = record.decision_strategy;
            } else {
                form.decision_strategy = '';
            }
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const emitUpdated = () => {
            setup.emit('updated', {
                data: [...form.items],
                decision_strategy: form.decision_strategy || undefined,
                valid: !$v.$invalid.value,
            });
        };

        const handleUpdated = (children: string[]) => {
            form.items = children;
            emitUpdated();
        };

        const decisionStrategyHint = computed(() => {
            switch (form.decision_strategy) {
                case DecisionStrategy.AFFIRMATIVE:
                    return 'At least one child policy must evaluate positively.';
                case DecisionStrategy.CONSENSUS:
                    return 'More child policies must evaluate positively than negatively.';
                case DecisionStrategy.UNANIMOUS:
                    return 'All child policies must evaluate positively.';
                default:
                    return 'No strategy selected. Defaults to unanimous (all child policies must evaluate positively).';
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
            $v,
            query,
            useFieldValidation,
        };
    },
});
</script>
<template>
    <div>
        <VCFormGroup :validation="useFieldValidation($v.fields.decision_strategy)">
            <template #label>
                Decision Strategy
            </template>
            <VCFormSelect
                v-model="$v.fields.decision_strategy.$model"
                :options="decisionStrategyOptions"
                :option-default="true"
                :option-default-value="'-- None (default: unanimous) --'"
                @change="handleDecisionStrategyUpdated"
            />
            <div class="alert alert-sm alert-info mt-1 mb-0">
                {{ decisionStrategyHint }}
            </div>
        </VCFormGroup>
        <VCFormGroup :validation="useFieldValidation($v.fields.items)">
            <template #label>
                Children
            </template>
            <APolicyChildrenPicker
                :parent-id="id"
                :query="query"
                :value="$v.fields.items.$model"
                @change="handleUpdated"
            />
        </VCFormGroup>
    </div>
</template>
