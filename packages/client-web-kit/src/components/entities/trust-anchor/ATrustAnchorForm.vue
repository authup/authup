<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { TrustAnchor } from '@authup/core-kit';
import { EntityType, TrustAnchorValidator } from '@authup/core-kit';
import {
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { ValidatorGroup, generateName } from '@authup/kit';
import { IFieldValidation } from '@ilingo/validup-vue';
import { useValidup } from '@validup/vue';
import {
    VCFormGroup,
    VCFormSwitch,
    VCFormTextarea,
} from '@vuecs/forms';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    useId,
    watch,
} from 'vue';
import {
    assignFormProperties,
    injectStore,
    storeToRefs,
    useTranslations,
} from '../../../core';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    ANameInput,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealmPicker } from '../realm';

export default defineComponent({
    components: {
        AFormSubmit,
        ANameInput,
        ARealmPicker,
        IFieldValidation,
        VCFormGroup,
        VCFormSwitch,
        VCFormTextarea,
    },
    props: {
        entity: { type: Object as PropType<TrustAnchor> },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<TrustAnchor>(),
    setup(props, ctx) {
        const busy = ref(false);
        const nameSeed = useId();
        const form = reactive({
            name: '',
            certificate: '',
            enabled: true,
            realmId: '',
        });

        const manager = defineEntityManager({
            type: EntityType.TRUST_ANCHOR,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
        const v = useValidup(
            new TrustAnchorValidator(),
            form as Partial<TrustAnchor>,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const store = injectStore();
        const storeRefs = storeToRefs(store);
        const realmLock = computed(() => {
            if (props.realmId) {
                return props.realmId;
            }

            if (!storeRefs.realmIsRoot.value) {
                return storeRefs.realmId.value;
            }

            return manager.data.value ? manager.data.value.realmId : null;
        });

        const updatedAt = useUpdatedAt(() => props.entity);

        function initForm() {
            assignFormProperties(form, manager.data.value, { fields: v.fields });

            if (props.realmId) {
                form.realmId = props.realmId;
            }

            if (form.name.length === 0) {
                form.name = generateName(nameSeed);
            }
        }

        watch(updatedAt, (value, oldValue) => {
            if (!value || value === oldValue) {
                return;
            }

            manager.data.value = props.entity;
            initForm();
        });

        initForm();

        const submit = async () => {
            if (busy.value || v.$invalid.value) {
                return;
            }

            busy.value = true;
            try {
                if (isEditing.value) {
                    await manager.createOrUpdate({
                        name: form.name,
                        enabled: form.enabled,
                    });
                    return;
                }

                await manager.createOrUpdate(form as Partial<TrustAnchor>);
            } finally {
                busy.value = false;
            }
        };

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CERTIFICATE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ENABLED,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.REALM,
                count: 1,
            },
        ]);

        return {
            busy,
            isEditing,
            realmLock,
            submit,
            translationsDefault,
            v,
        };
    },
});
</script>

<template>
    <form @submit.prevent="submit">
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.name"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translationsDefault.name }}
                </template>
                <ANameInput v-model="v.fields.name.$model.value" />
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.enabled"
        >
            <VCFormGroup :validation="value">
                <VCFormSwitch
                    v-model="v.fields.enabled.$model.value"
                    :label="true"
                    :label-content="translationsDefault.enabled"
                />
            </VCFormGroup>
        </IFieldValidation>

        <template v-if="!isEditing">
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.certificate"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.certificate }}
                    </template>
                    <VCFormTextarea
                        :model-value="v.fields.certificate.$model.value"
                        :rows="12"
                        @update:model-value="(next: string) => { v.fields.certificate.$model.value = next; }"
                    />
                </VCFormGroup>
            </IFieldValidation>

            <template v-if="!realmLock">
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.realmId"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.realm }}
                        </template>
                        <ARealmPicker
                            :value="v.fields.realmId.$model.value"
                            @change="(input: string[]) => {
                                v.fields.realmId.$model.value = input.length > 0 ? input[0] ?? '' : '';
                            }"
                        />
                    </VCFormGroup>
                </IFieldValidation>
            </template>
        </template>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="v.$invalid.value"
            @submit="submit"
        />
    </form>
</template>
