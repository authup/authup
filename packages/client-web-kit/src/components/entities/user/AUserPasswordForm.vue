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
} from 'vue';
import type { PropType } from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { injectHTTPClient, wrapFnWithBusyState } from '../../../core';
import { AFormSubmit } from '../../utility';

// Inline validator — there's no `UserPasswordValidator` in core-kit;
// `UserValidator` covers `password` for the entity-edit path. This
// password-only form has its own length + match contract.
class UserPasswordValidator extends Container<{ password: string; password_repeat: string }> {
    protected override initialize() {
        super.initialize();

        const passwordValidator = createValidator(z.string().min(5).max(100));
        this.mount('password', passwordValidator);

        // `password_repeat` matches `password` — the cross-field check
        // happens in the submit guard rather than the validator, because
        // validup's `Container` doesn't take a cross-field comparator
        // primitive (would require a custom `Validator` with access to
        // the whole `data` object via `ctx.data`).
        this.mount('password_repeat', passwordValidator);
    }
}

export const AUserPasswordForm = defineComponent({
    components: {
        VCFormGroup,
        VCFormInput,
        VCFormSwitch,
        AFormSubmit,
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

        const $v = useValidup(new UserPasswordValidator(), form);

        const submit = wrapFnWithBusyState(busy, async () => {
            if ($v.$invalid.value) return;
            if (form.password !== form.password_repeat) return;
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
            $v,
            submit,
            useFieldValidation,
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
        <VCFormGroup :validation="useFieldValidation($v.fields.password)">
            <template #label>
                Password
            </template>
            <VCFormInput
                v-model="$v.fields.password.$model.value"
                :type="passwordShow ? 'text' : 'password'"
                autocomplete="new-password"
            />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation($v.fields.password_repeat)">
            <template #label>
                Password repeat
            </template>
            <VCFormInput
                v-model="$v.fields.password_repeat.$model.value"
                :type="passwordShow ? 'text' : 'password'"
                autocomplete="new-password"
            />
        </VCFormGroup>

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
                :is-invalid="$v.$invalid"
                @submit="submit"
            />
        </div>
    </form>
</template>
