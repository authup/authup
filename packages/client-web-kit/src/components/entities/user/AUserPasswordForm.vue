<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { 
    defineComponent, 
    reactive, 
    ref, 
    toRef, 
} from 'vue';
import type { PropType } from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import useVuelidate from '@vuelidate/core';
import {
    maxLength,
    minLength,
    required,
    sameAs,
} from '@vuelidate/validators';
import { injectHTTPClient, wrapFnWithBusyState } from '../../../core';
import { AFormSubmit } from '../../utility';

export const AUserPasswordForm = defineComponent({
    components: {
        VCFormGroup,
        VCFormInput,
        VCFormSwitch,
        AFormSubmit,
        IVuelidate,
    },
    props: {
        id: {
            type: String as PropType<string | null>,
            default: undefined,
        },
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const apiClient = injectHTTPClient();
        const busy = ref(false);
        const form = reactive({
            password: '',
            password_repeat: '',
        });

        const passwordShow = ref(false);
        const passwordRef = toRef(form, 'password');

        const $v = useVuelidate({
            password: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(100),
            },
            password_repeat: {
                minLength: minLength(5),
                maxLength: maxLength(100),
                sameAs: sameAs(passwordRef),
            },
        }, form);

        const submit = wrapFnWithBusyState(busy, async () => {
            if ($v.value.$invalid) return;
            if (!props.id) return;

            try {
                const user = await apiClient.user.update(props.id, {
                    password: form.password,
                    password_repeat: form.password_repeat,
                });

                ctx.emit('updated', user);
            } catch (e) {
                if (e instanceof Error) {
                    ctx.emit('failed', e);
                }
            }
        });

        return {
            busy,
            passwordShow,
            vuelidate: $v,
            submit,
        };
    },
});

export default AUserPasswordForm;
</script>

<template>
    <form
        class="flex flex-col gap-3"
        @submit.prevent="submit"
    >
        <IVuelidate :validation="vuelidate.password">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Password
                    </template>
                    <VCFormInput
                        v-model="vuelidate.password.$model"
                        :type="passwordShow ? 'text' : 'password'"
                        autocomplete="new-password"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <IVuelidate :validation="vuelidate.password_repeat">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Password repeat
                    </template>
                    <VCFormInput
                        v-model="vuelidate.password_repeat.$model"
                        :type="passwordShow ? 'text' : 'password'"
                        autocomplete="new-password"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <div>
            <VCFormSwitch
                v-model="passwordShow"
                :label="true"
            >
                <template #label="{ id, class: labelClass }">
                    <!-- Render `<label for=id>` ourselves so clicking the text
                         toggles the switch (matches the implicit behavior of
                         passing labelContent as a string prop, which the
                         component wraps in <label for=id> internally). -->
                    <label
                        :for="id"
                        :class="labelClass"
                    >
                        Password {{ passwordShow ? 'hide' : 'show' }}
                    </label>
                </template>
            </VCFormSwitch>
        </div>

        <div>
            <AFormSubmit
                :is-busy="busy"
                :is-editing="true"
                :is-invalid="vuelidate.$invalid"
                @submit="submit"
            />
        </div>
    </form>
</template>
