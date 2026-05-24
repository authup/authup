<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { createNanoID } from '@authup/kit';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    watch,
} from 'vue';
import type { Realm } from '@authup/core-kit';
import { EntityType, REALM_MASTER_NAME } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormTextarea } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    VuelidateCustomRule,
    VuelidateCustomRuleKey,
    assignFormProperties,
    useTranslationsForGroup,
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
        IVuelidate,
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
        }, form);

        const manager = defineEntityManager({
            type: `${EntityType.REALM}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
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
            if ($v.value.$invalid) {
                return;
            }

            await manager.createOrUpdate(form);
        };

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
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
            vuelidate: $v,
            isEditing,
            isNameEmpty,
            isMaster,
            isCreating,
            translationsDefault,
            generateName,
            submit,
        };
    },
});

export default ARealmForm;
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
                        :disabled="isMaster"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

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
                <i class="fa fa-wrench" /> {{ translationsDefault.generate }}
            </button>
        </div>

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

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="vuelidate.$invalid"
            @submit="submit"
        />
    </form>
</template>
