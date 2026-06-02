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
import type { Robot } from '@authup/core-kit';
import { EntityType, RobotValidator } from '@authup/core-kit';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    assignFormProperties,
    useTranslationsForGroup,
} from '../../../core';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    AToggleButton,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealms } from '../realm';

export const ARobotForm = defineComponent({
    components: {
        ARealms,
        AFormSubmit,
        AToggleButton,
        VCFormGroup,
        VCFormInput,
    },
    props: {
        name: { type: String, default: undefined },
        entity: { type: Object as PropType<Robot>, default: undefined },
        realmId: { type: String, default: undefined },
    },
    emits: defineEntityVEmitOptions<Robot>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
            realm_id: '',
            secret: '',
        });

        const manager = defineEntityManager({
            type: `${EntityType.ROBOT}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const $v = useValidup(new RobotValidator(), form, {
            group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)),
        });

        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed(() => !!props.name && props.name.length > 0);
        const isRealmLocked = computed(() => !!props.realmId);
        const isSecretHashed = computed(
            () => manager.data.value &&
                manager.data.value.secret === form.secret &&
                form.secret.startsWith('$'),
        );

        const generateSecret = () => {
            form.secret = createNanoID(64);
        };

        function initForm() {
            assignFormProperties(form, manager.data.value);

            // Apply caller-fixed props AFTER assign so the entity payload
            // can't overwrite a locked name / realm.
            if (props.name) form.name = props.name;
            if (props.realmId) form.realm_id = props.realmId;

            if (form.secret.length === 0) {
                generateSecret();
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
                await manager.createOrUpdate({
                    ...form,
                    secret: isSecretHashed.value ? '' : form.secret,
                });
            } finally {
                busy.value = false;
            }
        };

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.GENERATE },
                { key: TranslatorTranslationDefaultKey.HASHED },
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
                { key: TranslatorTranslationDefaultKey.SECRET },
            ],
        );

        return {
            busy,
            form,
            $v,
            isEditing,
            isNameFixed,
            isRealmLocked,
            isSecretHashed,
            data: manager.data,
            translationsDefault,
            generateSecret,
            submit,
            useFieldValidation,
        };
    },
});

export default ARobotForm;
</script>

<template>
    <form @submit.prevent="submit">
        <div :class="!isRealmLocked ? 'row' : ''">
            <div :class="!isRealmLocked ? 'col' : ''">
                <template v-if="data">
                    <VCFormGroup>
                        <template #label>
                            ID
                        </template>
                        <VCFormInput
                            :model-value="data.id"
                            :disabled="true"
                        />
                    </VCFormGroup>
                </template>

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

                <VCFormGroup :validation="useFieldValidation($v.fields.secret)">
                    <template #label>
                        {{ translationsDefault.secret }}<span
                            v-if="isSecretHashed"
                            class="text-error-600 font-bold ps-1"
                        >
                            {{ translationsDefault.hashed }}
                            <VCIcon
                                name="fa6-solid:triangle-exclamation"
                                class="ps-1"
                            />
                        </span>
                    </template>
                    <VCFormInput v-model="$v.fields.secret.$model" />
                </VCFormGroup>

                <div>
                    <button
                        type="button"
                        class="btn btn-dark btn-xs"
                        @click.prevent="generateSecret"
                    >
                        <VCIcon name="fa6-solid:wrench" /> {{ translationsDefault.generate }}
                    </button>
                </div>

                <AFormSubmit
                    :is-busy="busy"
                    :is-editing="isEditing"
                    :is-invalid="$v.$invalid"
                    @submit="submit"
                />
            </div>

            <div
                v-if="!isRealmLocked"
                class="col"
            >
                <ARealms>
                    <template #itemActions="pickerProps">
                        <AToggleButton
                            :value="form.realm_id === pickerProps.data.id"
                            :is-busy="pickerProps.busy"
                            @changed="(value: boolean) => { form.realm_id = value ? pickerProps.data.id : ''; }"
                        />
                    </template>
                </ARealms>
            </div>
        </div>
    </form>
</template>
