<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { EntityType, ScopeValidator } from '@authup/core-kit';
import { ValidatorGroup } from '@authup/kit';
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
import type { Scope } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormTextarea } from '@vuecs/forms';
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

export const AScopeForm = defineComponent({
    components: {
        ARealmPicker,
        AFormSubmit,
        VCFormGroup,
        VCFormInput,
        VCFormTextarea,
    },
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: { type: Object as PropType<Scope> },
    },
    emits: defineEntityVEmitOptions<Scope>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
            description: '',
            realm_id: '',
        });

        const manager = defineEntityManager({
            type: `${EntityType.SCOPE}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const $v = useValidup(new ScopeValidator(), form, {
            group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)),
        });

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

        const isNameFixed = computed<boolean>(() => {
            if (!!props.name && props.name.length > 0) {
                return true;
            }

            return !!(manager.data.value && manager.data.value.built_in);
        });

        function initForm() {
            if (props.name) {
                form.name = props.name;
            }

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
            if ($v.$invalid.value) {
                return;
            }

            await manager.createOrUpdate(form);
        };

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
                { key: TranslatorTranslationDefaultKey.REALM },
            ],
        );

        return {
            busy,
            $v,
            isEditing,
            realmId,
            isNameFixed,
            translationsDefault,
            submit,
            useFieldValidation,
        };
    },
});

export default AScopeForm;
</script>

<template>
    <form @submit.prevent="submit">
        <VCFormGroup :validation="useFieldValidation($v.fields.name)">
            <template #label>
                {{ translationsDefault.name }}
            </template>
            <VCFormInput
                v-model="$v.fields.name.$model"
                :disabled="isNameFixed"
            />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation($v.fields.display_name)">
            <template #label>
                {{ translationsDefault.displayName }}
            </template>
            <VCFormInput v-model="$v.fields.display_name.$model" />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation($v.fields.description)">
            <template #label>
                {{ translationsDefault.description }}
            </template>
            <VCFormTextarea
                v-model="$v.fields.description.$model"
                :rows="7"
            />
        </VCFormGroup>

        <template v-if="!realmId && !isNameFixed && !isEditing">
            <VCFormGroup :validation="useFieldValidation($v.fields.realm_id)">
                <template #label>
                    {{ translationsDefault.realm }}
                </template>
                <ARealmPicker
                    :value="$v.fields.realm_id.$model"
                    @change="(input: string[]) => {
                        $v.fields.realm_id.$model = input.length > 0 ? input[0] ?? '' : '';
                    }"
                />
            </VCFormGroup>
        </template>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="$v.$invalid"
            @submit="submit"
        />
    </form>
</template>
