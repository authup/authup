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
import {
    Container,
    ValidupError,
    defineIssueItem,
} from 'validup';
import type { Validator } from 'validup';
import { z } from 'zod';
import { injectHTTPClient, wrapFnWithBusyState } from '../../../core';
import { AFormSubmit } from '../../utility';

// Cross-field equality between `password` and `password_repeat` — runs
// as a second mount on `password_repeat` so the first mount's length
// validator surfaces its own message independently.
const sameAsPassword: Validator = (ctx) => {
    const { value } = ctx;
    // If the value isn't a string at this point, the prior length
    // validator already failed — defer to its issue rather than adding
    // a confusing "doesn't match" alongside.
    if (typeof value !== 'string') {
        return value;
    }
    const { password } = ctx.data as { password?: unknown };
    if (value !== password) {
        // Bare-code path (defaults to `VALUE_INVALID`) + explicit
        // message. Parameterized `SAME_AS` would surface the contract
        // via `data: { other: 'password' }`, but `DefineIssueItemData`'s
        // overload selection in validup 0.4 didn't accept the literal
        // — bare-code + message gets the same end-user experience and
        // sidesteps the type-juggling. validup's run loop prefixes the
        // mount key on re-throw, so the issue lands under
        // `password_repeat` in `$errors`.
        const path: PropertyKey[] = [];
        throw new ValidupError([defineIssueItem({
            path,
            message: 'Must match the password.',
        })]);
    }
    return value;
};

// Inline validator — there's no `UserPasswordValidator` in core-kit;
// `UserValidator` covers `password` for the entity-edit path. This
// password-only form has its own length + match contract.
class UserPasswordValidator extends Container<{ password: string; password_repeat: string }> {
    protected override initialize() {
        super.initialize();

        const passwordValidator = createValidator(z.string().min(5).max(100));
        this.mount('password', passwordValidator);

        // Two mounts on `password_repeat` — length first, equality second.
        // Container runs mounts in order; a failure in the first short-
        // circuits the key, so consumers only see one issue at a time.
        this.mount('password_repeat', passwordValidator);
        this.mount('password_repeat', sameAsPassword);
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
            // `$v.$invalid` already covers length + password-repeat match
            // (the `sameAsPassword` validator above).
            if ($v.$invalid.value) return;
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
                :is-invalid="$v.$invalid.value"
                @submit="submit"
            />
        </div>
    </form>
</template>
