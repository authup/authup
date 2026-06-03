/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

<script lang="ts">
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import { z } from 'zod';
import { defineComponent, reactive } from 'vue';

// Per-row input validator — local because there's no
// "list item name" entity in core-kit.
class FormInputListItemValidator extends Container<{ name: string }> {
    protected override initialize() {
        super.initialize();
        this.mount('name', createValidator(z.string().min(2).max(512)));
    }
}

export default defineComponent({
    components: { VCFormInput, VCFormGroup },
    props: {
        name: {
            type: String,
            default: undefined,
        },
        disabled: {
            type: Boolean,
            default: false,
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
            useFieldValidation,
        };
    },
});
</script>
<template>
    <VCFormGroup :validation="useFieldValidation(v.fields.name)">
        <VCFormInput
            v-model="v.fields.name.$model.value"
            @change="handleUpdated"
        >
            <template #groupAppend>
                <button
                    :disabled="disabled"
                    type="button"
                    class="btn btn-xs btn-warning"
                    @click.prevent="handleDeleted"
                >
                    <VCIcon name="fa6-solid:minus" />
                </button>
            </template>
        </VCFormInput>
    </VCFormGroup>
</template>
