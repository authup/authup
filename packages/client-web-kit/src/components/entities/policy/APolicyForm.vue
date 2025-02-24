<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, ref } from 'vue';
import type { Policy } from '@authup/core-kit';
import { ResourceType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import { BuiltInPolicyType } from '@authup/access';
import { onChange, useIsEditing, useUpdatedAt } from '../../../composables';
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
    },
    setup(props, ctx) {
        const type = ref<string | null>(null);
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
            type: `${ResourceType.POLICY}`,
            setup: ctx,
            props,
        });

        const updatedAt = useUpdatedAt(manager.data);
        const isEditing = useIsEditing(manager.data);

        const setType = (val: string | null): void => {
            type.value = val;
        };

        const setTypeByEntity = () => {
            if (manager.data.value && manager.data.value.type) {
                type.value = manager.data.value.type;
            }
        };

        setTypeByEntity();

        onChange(updatedAt, () => setTypeByEntity());

        const vuelidate = useVuelidate({ $stopPropagation: true });

        const submit = async () => {
            if (vuelidate.value.$invalid) {
                return;
            }

            const { items = [], ...data } = {
                ...extractVuelidateResultsFromChild(vuelidate, 'basic'),
                ...extractVuelidateResultsFromChild(vuelidate, 'type'),
            } as Partial<Omit<Policy, 'children'>> & {items: string[]};

            if (type.value) {
                data.type = type.value;
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
            type,
            typeComponents,
            setType,
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
        <template v-if="!isEditing">
            <APolicyTypePicker
                v-if="!isEditing"
                :type="type"
                @pick="setType"
            />

            <template v-if="type">
                <hr>
            </template>
        </template>

        <template v-if="type">
            <h6>General</h6>
            <APolicyBasicForm :entity="data" />

            <template v-if="type in typeComponents">
                <h6>Custom</h6>
                <component
                    :is="typeComponents[type]"
                    :entity="entity"
                />
            </template>

            <div>
                <AFormSubmit
                    :is-invalid="vuelidate.$invalid || !type"
                    :is-busy="busy"
                    :is-editing="isEditing"
                    @submit="submit"
                />
            </div>
        </template>
    </div>
</template>
