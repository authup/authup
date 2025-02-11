/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

<script lang="ts">
import { IVuelidate } from '@ilingo/vuelidate';
import { VCFormGroup, VCFormInput } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import {
    defineComponent, reactive,
} from 'vue';

export default defineComponent({
    components: { IVuelidate, VCFormInput, VCFormGroup },
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
        const form = reactive({
            name: props.name,
        });

        const vuelidate = useVuelidate({
            name: {
                required,
                minLength: minLength(2),
                maxLength: maxLength(512),
            },
        }, form);

        const handleUpdated = () => {
            ctx.emit('updated', vuelidate.value.name.$model);
        };

        const handleDeleted = () => {
            ctx.emit('deleted');
        };

        return {
            handleUpdated,
            handleDeleted,
            vuelidate,
        };
    },
});
</script>
<template>
    <IVuelidate :validation="vuelidate.name">
        <template #default="props">
            <VCFormGroup
                :validation-messages="props.data"
                :validation-severity="props.severity"
            >
                <VCFormInput
                    v-model="vuelidate.name.$model"
                    @change="handleUpdated"
                >
                    <template #groupAppend>
                        <button
                            :disabled="disabled"
                            type="button"
                            class="btn btn-xs btn-warning"
                            @click.prevent="handleDeleted"
                        >
                            <i class="fa fa-minus" />
                        </button>
                    </template>
                </VCFormInput>
            </VCFormGroup>
        </template>
    </IVuelidate>
</template>
