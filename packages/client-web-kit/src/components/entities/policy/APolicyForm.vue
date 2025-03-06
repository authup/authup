<script lang="ts">
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import type { Policy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import { BuiltInPolicyType } from '@authup/access';
import { useIsEditing } from '../../../composables';
import { extractVuelidateResultsFromChild, injectHTTPClient } from '../../../core';
import { AFormSubmit, defineEntityManager } from '../../utility';
import APolicyBasicForm from './APolicyBasicForm.vue';
import APolicyTypePicker from './APolicyTypePicker.vue';
import AAttributeNamesPolicyForm from './attribute-names/AAttributeNamesPolicyForm.vue';
import ACompositePolicyForm from './composite/ACompositePolicyForm.vue';
import ADatePolicyForm from './date/ADatePolicyForm.vue';
import ARealmMatchPolicyForm from './realm-match/ARealmMatchPolicyForm.vue';
import ATimePolicyForm from './time/ATimePolicyForm.vue';
import AIdentityPolicyForm from './identity/AIdentityPolicyForm.vue';

export default defineComponent({
    components: { AFormSubmit, APolicyTypePicker, APolicyBasicForm },
    props: {
        entity: {
            type: Object as PropType<Policy>,
        },
        type: {
            type: String as PropType<string>,
        },
    },
    setup(props, ctx) {
        const typeComponents : Record<string, any> = {
            [BuiltInPolicyType.IDENTITY]: AIdentityPolicyForm,
            [BuiltInPolicyType.REALM_MATCH]: ARealmMatchPolicyForm,
            [BuiltInPolicyType.COMPOSITE]: ACompositePolicyForm,
            [BuiltInPolicyType.DATE]: ADatePolicyForm,
            [BuiltInPolicyType.TIME]: ATimePolicyForm,
            [BuiltInPolicyType.ATTRIBUTE_NAMES]: AAttributeNamesPolicyForm,
        };

        const httpClient = injectHTTPClient();
        const manager = defineEntityManager({
            type: `${EntityType.POLICY}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const typeComputed = computed<string | null>(() => {
            if (manager.data.value) {
                return manager.data.value.type;
            }

            if (props.type) {
                return props.type;
            }

            return null;
        });

        const vuelidate = useVuelidate({ $stopPropagation: true });

        const submit = async () => {
            if (vuelidate.value.$invalid) {
                return;
            }

            const { items = [], ...data } = {
                ...extractVuelidateResultsFromChild(vuelidate, 'basic'),
                ...extractVuelidateResultsFromChild(vuelidate, 'type'),
            } as Partial<Omit<Policy, 'children'>> & {items: string[]};

            if (typeComputed.value) {
                data.type = typeComputed.value;
            }

            await manager.createOrUpdate(data);

            if (manager.data.value) {
                if (items.length > 0) {
                    for (let i = 0; i < items.length; i++) {
                        await httpClient.policy.update(items[i], {
                            parent_id: manager.data.value.id,
                        });
                    }
                }
            }
        };

        return {
            typeComputed,
            typeComponents,
            data: manager.data,
            busy: manager.busy,
            isEditing,
            submit,
            vuelidate,
        };
    },
});
</script>
<template>
    <div class="d-flex flex-column">
        <h6>General</h6>
        <APolicyBasicForm :entity="data" />

        <template v-if="typeComputed">
            <slot
                name="default"
                :entity="entity"
            >
                <template v-if="typeComputed in typeComponents">
                    <component
                        :is="typeComponents[typeComputed]"
                        :entity="entity"
                    />
                </template>
            </slot>
        </template>

        <div>
            <AFormSubmit
                :is-invalid="vuelidate.$invalid || !typeComputed"
                :is-busy="busy"
                :is-editing="isEditing"
                @submit="submit"
            />
        </div>
    </div>
</template>
