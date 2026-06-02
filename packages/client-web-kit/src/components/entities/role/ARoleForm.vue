<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { EntityType, RoleValidator } from '@authup/core-kit';
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
import type { Role } from '@authup/core-kit';
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

export const ARoleForm = defineComponent({
    components: {
        ARealmPicker,
        AFormSubmit,
        VCFormGroup,
        VCFormInput,
        VCFormTextarea,
    },
    props: {
        entity: {
            type: Object as PropType<Role>,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<Role>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
            description: '',
            realm_id: '',
        });

        const manager = defineEntityManager({
            type: `${EntityType.ROLE}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        // Shared `RoleValidator` from `@authup/core-kit` — same instance
        // the server-core provisioning service runs. `group` is reactive
        // so the validator switches between `CREATE` (strict) and
        // `UPDATE` (every field optional) when the form flips between
        // create and edit modes.
        const $v = useValidup(
            new RoleValidator(),
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

        function initForm() {
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
            translationsDefault,
            submit,
            useFieldValidation,
        };
    },
});

export default ARoleForm;
</script>

<template>
    <form @submit.prevent="submit">
        <VCFormGroup :validation="useFieldValidation($v.fields.name!)">
            <template #label>
                {{ translationsDefault.name }}
            </template>
            <VCFormInput v-model="$v.fields.name!.$model.value" />
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
                :rows="6"
            />
        </VCFormGroup>

        <template v-if="!realmId && !isEditing">
            <VCFormGroup :validation="useFieldValidation($v.fields.realm_id!)">
                <template #label>
                    {{ translationsDefault.realm }}
                </template>
                <ARealmPicker
                    :value="$v.fields.realm_id!.$model.value"
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
