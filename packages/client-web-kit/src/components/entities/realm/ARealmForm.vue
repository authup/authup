<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { ValidatorGroup, createNanoID } from '@authup/kit';
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
import type { Realm } from '@authup/core-kit';
import { EntityType, REALM_MASTER_NAME, RealmValidator } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormTextarea } from '@vuecs/forms';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    assignFormProperties,
    useTranslationsForNamespace,
} from '../../../core';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';

export const ARealmForm = defineComponent({
    components: {
        AFormSubmit,
        VCFormGroup,
        VCFormInput,
        VCFormTextarea,
    },
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: false,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<Realm>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
            description: '',
        });

        const manager = defineEntityManager({
            type: `${EntityType.REALM}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const $v = useValidup(
            new RealmValidator(),
            form,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const updatedAt = useUpdatedAt(props.entity);
        const isNameEmpty = computed(() => !form.name || form.name.length === 0);
        const isMaster = computed(() => manager.data.value &&
            manager.data.value.name === REALM_MASTER_NAME);
        const isCreating = computed(() => !manager.data.value || !manager.data.value.id);

        const generateName = () => {
            form.name = createNanoID();
        };

        function initForm() {
            assignFormProperties(form, manager.data.value);

            if (form.name.length === 0) {
                generateName();
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
            if ($v.$invalid.value) {
                return;
            }

            await manager.createOrUpdate(form);
        };

        const translationsDefault = useTranslationsForNamespace(
            TranslatorTranslationNamespace.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.GENERATE },
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
            isNameEmpty,
            isMaster,
            isCreating,
            translationsDefault,
            generateName,
            submit,
            useFieldValidation,
        };
    },
});

export default ARealmForm;
</script>

<template>
    <form @submit.prevent="submit">
        <VCFormGroup :validation="useFieldValidation($v.fields.name)">
            <template #label>
                {{ translationsDefault.name }}
            </template>
            <VCFormInput
                v-model="$v.fields.name.$model.value"
                :disabled="isMaster"
            />
        </VCFormGroup>

        <div
            v-if="isCreating"
            class="mb-3"
        >
            <button
                type="button"
                class="btn btn-xs"
                :class="{ 'btn-dark': isNameEmpty, 'btn-warning': !isNameEmpty }"
                @click.prevent="generateName"
            >
                <VCIcon name="fa6-solid:wrench" /> {{ translationsDefault.generate }}
            </button>
        </div>

        <VCFormGroup :validation="useFieldValidation($v.fields.display_name)">
            <template #label>
                {{ translationsDefault.displayName }}
            </template>
            <VCFormInput
                :model-value="$v.fields.display_name.$model.value ?? ''"
                @update:model-value="(v: string) => { $v.fields.display_name.$model.value = v; }"
            />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation($v.fields.description)">
            <template #label>
                {{ translationsDefault.description }}
            </template>
            <VCFormTextarea
                :model-value="$v.fields.description.$model.value ?? ''"
                :rows="4"
                @update:model-value="(v: string) => { $v.fields.description.$model.value = v; }"
            />
        </VCFormGroup>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="$v.$invalid.value"
            @submit="submit"
        />
    </form>
</template>
