<!--
  Copyright (c) 2022-2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { DEFAULT_BUTTON_SIZE, assignFormProperties, useTranslations } from '../../../core';
import { z } from 'zod';
import type { PropType } from 'vue';
import { defineComponent, reactive, ref } from 'vue';
import type { IdentityProviderRoleMapping, Role } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import type { ButtonSize } from '@vuecs/button';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { useAlertDialog } from '@vuecs/overlays';
import { IFieldValidation } from '@ilingo/validup-vue';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';

// Inline attribute-only validator. `@authup/core-kit`'s
// `IdentityProviderRoleMappingValidator` does cover these three keys
// but also mounts the foreign-key columns (`providerId`, `roleId`)
// — those are supplied by the parent component at submit time, not by
// the form, so routing through the entity validator would require an
// always-`UPDATE` group cast that obscures intent. A follow-up split
// in core-kit (`…AttributesValidator` vs `…EntityValidator`) would let
// this collapse to a re-export.
class RoleMappingAttributesValidator extends Container<{
    name: string;
    value: string;
    valueIsRegex: boolean;
}> {
    protected override initialize() {
        super.initialize();
        this.mount('name', { optional: true }, createValidator(z.string().min(3).max(32)));
        this.mount('value', { optional: true }, createValidator(z.string().min(3).max(128)));
        this.mount('valueIsRegex', { optional: true }, createValidator(z.boolean()));
    }
}

export default defineComponent({
    components: {
        VCFormGroup,
        VCFormInput,
        VCFormSwitch,
        VCButton,
        VCIcon,

        IFieldValidation,
    },
    props: {
        role: {
            type: Object as PropType<Role>,
            required: true,
        },
        entityId: {
            type: String,
            required: true,
        },
        size: {
            type: String as PropType<ButtonSize>,
            default: DEFAULT_BUTTON_SIZE,
        },
    },
    emits: defineEntityVEmitOptions<IdentityProviderRoleMapping>(),
    async setup(props, setup) {
        const display = ref(false);
        const toggleDisplay = () => {
            display.value = !display.value;
        };

        const form = reactive({
            name: '',
            value: '',
            valueIsRegex: false,
        });

        const v = useValidup(new RoleMappingAttributesValidator(), form);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.VALUE_IS_REGEX,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.REMOVE,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ABORT,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.REMOVE_CONFIRM_TITLE,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.REMOVE_CONFIRM_DESCRIPTION,
            },
        ]);

        // Role-mapping removal is a role grant — confirm it (mirrors the
        // <AToggleButton withPrompt> path used by the other grant assignments).
        const confirmDialog = useAlertDialog();

        const manager = defineEntityManager({
            type: `${EntityType.IDENTITY_PROVIDER_ROLE_MAPPING}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.roleId === props.role.id &&
                        event.data.providerId === props.entityId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    roleId: props.role.id,
                    providerId: props.entityId,
                },
            },
        });

        if (manager.data.value) {
            assignFormProperties(form, manager.data.value, { fields: v.fields });
        }

        const handleSaveOrCreate = (e: Event) => {
            e.preventDefault();

            if (manager.data.value) {
                return manager.update(form);
            }

            return manager.create({
                ...form,
                providerId: props.entityId,
                roleId: props.role.id,
            });
        };

        const handleDelete = async (e: Event) => {
            e.preventDefault();

            const confirmed = await confirmDialog({
                title: translationsDefault.removeConfirmTitle,
                description: translationsDefault.removeConfirmDescription,
                confirmLabel: translationsDefault.remove,
                cancelLabel: translationsDefault.abort,
                tone: 'error',
            });

            if (!confirmed) {
                return undefined;
            }

            return manager.delete();
        };

        return {
            display,
            toggleDisplay,
            v,
            translationsDefault,
            manager,
            handleSaveOrCreate,
            handleDelete,
        };
    },
});
</script>
<template>
    <div class="flex flex-col">
        <div class="flex flex-row">
            <div class="me-2">
                <VCButton
                    :size="size"
                    color="neutral"
                    @click.prevent="toggleDisplay()"
                >
                    <VCIcon :name="display ? 'fa6-solid:chevron-up' : 'fa6-solid:chevron-down'" />
                </VCButton>
            </div>
            <div>
                <h6
                    class="mb-0"
                    @click.prevent="toggleDisplay()"
                >
                    {{ role.name }}
                </h6>
            </div>
            <div class="ms-auto">
                <VCButton
                    :size="size"
                    :color="manager.data.value ? 'neutral' : 'primary'"
                    @click="handleSaveOrCreate"
                >
                    <VCIcon :name="manager.data.value ? 'fa6-solid:floppy-disk' : 'fa6-solid:plus'" />
                </VCButton>
                <VCButton
                    v-if="manager.data.value"
                    :size="size"
                    color="error"
                    class="ms-1"
                    :disabled="manager.busy.value"
                    @click="handleDelete"
                >
                    <VCIcon name="fa6-solid:trash" />
                </VCButton>
            </div>
        </div>
        <div
            v-if="display"
            class="mt-2"
        >
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.name"
            >
                <VCFormGroup
                    :label="true"
                    :validation="value"
                >
                    <template #label>
                        Name
                    </template>
                    <VCFormInput v-model="v.fields.name.$model.value" />
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.value"
            >
                <VCFormGroup
                    :label="true"
                    :validation="value"
                >
                    <template #label>
                        Value
                    </template>
                    <VCFormInput v-model="v.fields.value.$model.value" />
                </VCFormGroup>
            </IFieldValidation>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.valueIsRegex"
            >
                <VCFormGroup
                    :label="true"
                    :validation="value"
                >
                    <template #label>
                        Regex
                    </template>
                    <VCFormSwitch
                        v-model="v.fields.valueIsRegex.$model.value"
                        :label-content="translationsDefault.valueIsRegex"
                    />
                </VCFormGroup>
            </IFieldValidation>
        </div>
    </div>
</template>
