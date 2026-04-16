<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength } from '@vuelidate/validators';
import type { PropType } from 'vue';
import { defineComponent, reactive, ref } from 'vue';
import type { IdentityProviderRoleMapping, Role } from '@authup/core-kit';
import { VCFormGroup, VCFormInput, VCFormInputCheckbox } from '@vuecs/form-controls';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    assignFormProperties,
    getVuelidateSeverity,
    useTranslationsForGroup,
    useTranslationsForNestedValidation,
} from '../../../core';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';

export default defineComponent({
    components: {
        VCFormGroup, 
        VCFormInput, 
        VCFormInputCheckbox, 
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

        const $v = useVuelidate({
            name: {
                minLength: minLength(3),
                maxLength: maxLength(32),
            },
            value: {
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            value_is_regex: {},
        }, form);

        const validationMessages = useTranslationsForNestedValidation($v.value);
        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
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
            validationMessages,
            translationsDefault,
            manager,
            handleSaveOrCreate,
            handleDelete,
            getVuelidateSeverity,
        };
    },
});
</script>
<template>
    <div class="list-item flex-column">
        <div class="d-flex flex-row">
            <div class="me-2">
                <button
                    class="btn btn-xs btn-dark"
                    @click.prevent="toggleDisplay()"
                >
                    <i
                        :class="['fa', {
                            'fa-chevron-down': !display,
                            'fa-chevron-up': display,
                        }]"
                    />
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
                    <i
                        :class="['fa', {
                            'fa-plus': !manager.data.value,
                            'fa-save': manager.data.value,
                        }]"
                    />
                </button>
                <button
                    v-if="manager.data.value"
                    class="btn btn-xs btn-danger ms-1"
                    :disabled="manager.busy.value"
                    @click="handleDelete"
                >
                    <i class="fa fa-trash" />
                </button>
            </div>
        </div>
        <div
            v-if="display"
            class="mt-2"
        >
            <VCFormGroup
                :label="true"
                :validation-messages="validationMessages.name.value"
                :validation-severity="getVuelidateSeverity($v.name)"
            >
                <template #label>
                    Name
                </template>
                <VCFormInput
                    v-model="$v.name.$model"
                />
            </VCFormGroup>
            <VCFormGroup
                :label="true"
                :validation-messages="validationMessages.value.value"
                :validation-severity="getVuelidateSeverity($v.value)"
            >
                <template #label>
                    Value
                </template>
                <VCFormInput
                    v-model="$v.value.$model"
                />
            </VCFormGroup>
            <VCFormGroup
                :label="true"
                :validation-messages="validationMessages.value_is_regex.value"
                :validation-severity="getVuelidateSeverity($v.value_is_regex)"
            >
                <template #label>
                    Regex
                </template>
                <VCFormInputCheckbox
                    v-model="$v.value_is_regex.$model"
                    group-class="form-switch"
                    :label-content="translationsDefault.valueIsRegex.value"
                />
            </VCFormGroup>
        </div>
    </div>
</template>
