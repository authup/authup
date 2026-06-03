<!--
  Copyright (c) 2022-2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import { z } from 'zod';
import type { PropType } from 'vue';
import { defineComponent, reactive, ref } from 'vue';
import type { IdentityProviderRoleMapping, Role } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    assignFormProperties,
    useTranslationsForNamespace,
} from '../../../core';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';

// Inline attribute-only validator. `@authup/core-kit`'s
// `IdentityProviderRoleMappingValidator` does cover these three keys
// but also mounts the foreign-key columns (`provider_id`, `role_id`)
// — those are supplied by the parent component at submit time, not by
// the form, so routing through the entity validator would require an
// always-`UPDATE` group cast that obscures intent. A follow-up split
// in core-kit (`…AttributesValidator` vs `…EntityValidator`) would let
// this collapse to a re-export.
class RoleMappingAttributesValidator extends Container<{
    name: string;
    value: string;
    value_is_regex: boolean;
}> {
    protected override initialize() {
        super.initialize();
        this.mount('name', { optional: true }, createValidator(z.string().min(3).max(32)));
        this.mount('value', { optional: true }, createValidator(z.string().min(3).max(128)));
        this.mount('value_is_regex', { optional: true }, createValidator(z.boolean()));
    }
}

export default defineComponent({
    components: {
        VCFormGroup, 
        VCFormInput, 
        VCFormSwitch, 
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
            value_is_regex: false,
        });

        const $v = useValidup(new RoleMappingAttributesValidator(), form);

        const translationsDefault = useTranslationsForNamespace(
            TranslatorTranslationNamespace.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.VALUE_IS_REGEX },
            ],
        );

        const manager = defineEntityManager({
            type: `${EntityType.IDENTITY_PROVIDER_ROLE_MAPPING}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.role_id === props.role.id &&
                        event.data.provider_id === props.entityId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    role_id: props.role.id,
                    provider_id: props.entityId,
                },
            },
        });

        if (manager.data.value) {
            assignFormProperties(form, manager.data.value);
        }

        const handleSaveOrCreate = (e: Event) => {
            e.preventDefault();

            if (manager.data.value) {
                return manager.update(form);
            }

            return manager.create({
                ...form,
                provider_id: props.entityId,
                role_id: props.role.id,
            });
        };

        const handleDelete = (e: Event) => {
            e.preventDefault();

            return manager.delete();
        };

        return {
            display,
            toggleDisplay,
            $v,
            translationsDefault,
            manager,
            handleSaveOrCreate,
            handleDelete,
            useFieldValidation,
        };
    },
});
</script>
<template>
    <div class="list-item flex-col">
        <div class="flex flex-row">
            <div class="me-2">
                <button
                    class="btn btn-xs btn-dark"
                    @click.prevent="toggleDisplay()"
                >
                    <VCIcon :name="display ? 'fa6-solid:chevron-up' : 'fa6-solid:chevron-down'" />
                </button>
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
                <button
                    :class="['btn btn-xs', {
                        'btn-primary': !manager.data.value,
                        'btn-dark': !!manager.data.value,
                    }]"
                    @click="handleSaveOrCreate"
                >
                    <VCIcon :name="manager.data.value ? 'fa6-solid:floppy-disk' : 'fa6-solid:plus'" />
                </button>
                <button
                    v-if="manager.data.value"
                    class="btn btn-xs btn-danger ms-1"
                    :disabled="manager.busy.value"
                    @click="handleDelete"
                >
                    <VCIcon name="fa6-solid:trash" />
                </button>
            </div>
        </div>
        <div
            v-if="display"
            class="mt-2"
        >
            <VCFormGroup
                :label="true"
                :validation="useFieldValidation($v.fields.name)"
            >
                <template #label>
                    Name
                </template>
                <VCFormInput v-model="$v.fields.name.$model.value" />
            </VCFormGroup>
            <VCFormGroup
                :label="true"
                :validation="useFieldValidation($v.fields.value)"
            >
                <template #label>
                    Value
                </template>
                <VCFormInput v-model="$v.fields.value.$model.value" />
            </VCFormGroup>
            <VCFormGroup
                :label="true"
                :validation="useFieldValidation($v.fields.value_is_regex)"
            >
                <template #label>
                    Regex
                </template>
                <VCFormSwitch
                    v-model="$v.fields.value_is_regex.$model.value"
                    :label-content="translationsDefault.valueIsRegex.value"
                />
            </VCFormGroup>
        </div>
    </div>
</template>
