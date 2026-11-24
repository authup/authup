<script lang="ts">
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
} from 'vue';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { Policy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { BuiltInPolicyType } from '@authup/access';
import {
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useIsEditing } from '../../../composables/index.ts';
import { extractValidupResultsFromChild, injectHTTPClient, useTranslationsForNamespace } from '../../../core/index.ts';
import { AFormSubmit, defineEntityManager } from '../../utility/index.ts';
import APolicyBasicForm from './APolicyBasicForm.vue';
import APolicyTypePicker from './APolicyTypePicker.vue';
import AAttributeNamesPolicyForm from './attribute-names/AAttributeNamesPolicyForm.vue';
import ACompositePolicyForm from './composite/ACompositePolicyForm.vue';
import ADatePolicyForm from './date/ADatePolicyForm.vue';
import AClientMatchPolicyForm from './client-match/AClientMatchPolicyForm.vue';
import ARealmMatchPolicyForm from './realm-match/ARealmMatchPolicyForm.vue';
import ATimePolicyForm from './time/ATimePolicyForm.vue';
import AIdentityPolicyForm from './identity/AIdentityPolicyForm.vue';

export default defineComponent({
    components: {
        AFormSubmit,
        APolicyTypePicker,
        APolicyBasicForm,
    },
    props: {
        entity: { type: Object as PropType<Policy> },
        type: { type: String as PropType<string> },
    },
    setup(props, ctx) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typeComponents: Record<string, any> = {
            [BuiltInPolicyType.IDENTITY]: AIdentityPolicyForm,
            [BuiltInPolicyType.REALM_MATCH]: ARealmMatchPolicyForm,
            [BuiltInPolicyType.CLIENT_MATCH]: AClientMatchPolicyForm,
            [BuiltInPolicyType.COMPOSITE]: ACompositePolicyForm,
            [BuiltInPolicyType.DATE]: ADatePolicyForm,
            [BuiltInPolicyType.TIME]: ATimePolicyForm,
            [BuiltInPolicyType.ATTRIBUTE_NAMES]: AAttributeNamesPolicyForm,
        };

        const httpClient = injectHTTPClient();
        const manager = defineEntityManager({
            type: EntityType.POLICY,
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

        // Parent collector — the empty `Container` + empty state
        // make this a registration-only Composable that aggregates the
        // 'basic' + 'type' child slots via `$getResultsForChild`.
        // `stopPropagation: true` mirrors vuelidate's `$stopPropagation`
        // — don't register THIS form with an even-higher-level collector
        // (no real one exists today, but it future-proofs the contract).
        const v = useValidup(new Container(), reactive({}), { stopPropagation: true });

        // The parent's `$invalid` only includes the parent's own issues
        // (which is always empty here); aggregate the children's status
        // for the submit gate.
        const isInvalidComputed = computed(() => {
            const basic = v.$getResultsForChild('basic');
            const type = v.$getResultsForChild('type');

            return !typeComputed.value ||
                !!basic?.$invalid.value ||
                !!type?.$invalid.value;
        });

        const submit = async () => {
            if (isInvalidComputed.value) {
                return;
            }

            const {
                items = [],
                ...data
            } = {
                ...extractValidupResultsFromChild(v, 'basic'),
                ...extractValidupResultsFromChild(v, 'type'),
            } as Partial<Omit<Policy, 'children'>> & { items: string[] };

            if (typeComputed.value) {
                data.type = typeComputed.value;
            }

            await manager.createOrUpdate(data);

            if (manager.data.value) {
                if (items.length > 0) {
                    for (const item of items) {
                        await httpClient.policy.update(item, { parentId: manager.data.value.id });
                    }
                }
            }
        };

        const translations = useTranslationsForNamespace(
            TranslatorTranslationNamespace.COMMON,
            [
                { key: TranslatorTranslationCommonKey.GENERAL },
            ],
        );

        return {
            typeComputed,
            typeComponents,
            data: manager.data,
            busy: manager.busy,
            isEditing,
            isInvalid: isInvalidComputed,
            submit,
            translations,
        };
    },
});
</script>
<template>
    <fieldset
        :disabled="busy"
        class="m-0 min-w-0 border-0 p-0"
    >
        <!--
            Disabled while a save is pending: the response re-initializes
            the form from the saved snapshot, so an edit typed meanwhile
            would be overwritten.
        -->
        <div class="flex flex-col">
            <h6>{{ translations.general }}</h6>
            <APolicyBasicForm
                :entity="data"
                :type="typeComputed"
            />

            <template v-if="typeComputed">
                <slot
                    name="default"
                    :entity="entity"
                >
                    <template v-if="typeComputed in typeComponents">
                        <component
                            :is="typeComponents[typeComputed]"
                            :entity="entity"
                            :busy="busy"
                        />
                    </template>
                </slot>
            </template>

            <div>
                <AFormSubmit
                    :is-invalid="isInvalid"
                    :is-busy="busy"
                    :is-editing="isEditing"
                    @submit="submit"
                />
            </div>
        </div>
    </fieldset>
</template>
