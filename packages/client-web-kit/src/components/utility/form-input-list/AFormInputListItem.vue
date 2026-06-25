/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

<script lang="ts">
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import type { ButtonSize } from '@vuecs/button';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { z } from 'zod';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { IFieldValidation } from '@ilingo/validup-vue';
import { DEFAULT_BUTTON_SIZE } from '../../../core';

// Per-row input validator — local because there's no
// "list item name" entity in core-kit.
class FormInputListItemValidator extends Container<{ name: string }> {
    protected override initialize() {
        super.initialize();
        this.mount('name', createValidator(z.string().min(2).max(512)));
    }
}

export default defineComponent({
    components: {
        VCFormInput,
        VCFormGroup,
        VCButton,
        VCIcon,
        IFieldValidation,
    },
    props: {
        name: {
            type: String,
            default: undefined,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        size: {
            type: String as PropType<ButtonSize>,
            default: DEFAULT_BUTTON_SIZE,
        },
    },
    emits: ['updated', 'deleted'],
    setup(props, ctx) {
        const form = reactive({ name: props.name ?? '' });

        const v = useValidup(new FormInputListItemValidator(), form, { detached: true });

        const handleUpdated = () => {
            ctx.emit('updated', v.fields.name.$model.value);
        };

        const handleDeleted = () => {
            ctx.emit('deleted');
        };

        return {
            handleUpdated,
            handleDeleted,
            v,
        };
    },
});
</script>
<template>
    <IFieldValidation
        v-slot="{ value }"
        :field="v.fields.name"
    >
        <VCFormGroup :validation="value">
            <VCFormInput
                v-model="v.fields.name.$model.value"
                @change="handleUpdated"
            >
                <template #groupAppend>
                    <VCButton
                        :disabled="disabled"
                        type="button"
                        :size="size"
                        color="warning"
                        @click.prevent="handleDeleted"
                    >
                        <VCIcon name="fa6-solid:minus" />
                    </VCButton>
                </template>
            </VCFormInput>
        </VCFormGroup>
    </IFieldValidation>
</template>
