<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { EntityType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    watch,
} from 'vue';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { Role } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormTextarea } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    VuelidateCustomRule,
    VuelidateCustomRuleKey,
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
        IVuelidate,
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

        const $v = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(30),
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
            realm_id: {},
        }, form);

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const manager = defineEntityManager({
            type: `${EntityType.ROLE}`,
            setup: ctx,
            props,
        });

        const realmId = computed(() => {
            if (!storeRefs.realmIsRoot) {
                return storeRefs.realmId.value;
            }

            return manager.data.value ?
                manager.data.value.realm_id :
                null;
        });

        const isEditing = useIsEditing(manager.data);
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
            if ($v.value.$invalid) {
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
            vuelidate: $v,
            isEditing,
            realmId,
            translationsDefault,
            submit,
        };
    },
});

export default ARoleForm;
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
                    <VCFormInput v-model="vuelidate.name.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>

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
                        :rows="6"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <template v-if="!realmId && !isEditing">
            <IVuelidate :validation="vuelidate.realm_id">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <template #label>
                            {{ translationsDefault.realm }}
                        </template>
                        <ARealmPicker
                            :value="vuelidate.realm_id.$model"
                            @change="(input: string[]) => {
                                vuelidate.realm_id.$model = input.length > 0 ? input[0] ?? '' : '';
                            }"
                        />
                    </VCFormGroup>
                </template>
            </IVuelidate>
        </template>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="vuelidate.$invalid"
            @submit="submit"
        />
    </form>
</template>
