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
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { injectHTTPClient, useTranslations, wrapFnWithBusyState } from '../../../core';
import { createValidator } from '@validup/zod';
import {
    Container,
    ValidupError,
    defineIssueItem,
} from 'validup';
import type { Validator } from 'validup';
import { z } from 'zod';
import { AFormSubmit } from '../../utility';
import { IFieldValidation } from '@ilingo/validup-vue';

// Cross-field equality between `password` and `passwordRepeat` — runs
// as a second mount on `passwordRepeat` so the first mount's length
// validator surfaces its own message independently.
const createSameAsPassword = (message: () => string): Validator => (ctx) => {
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
        // `passwordRepeat` in `$errors`.
        const path: PropertyKey[] = [];
        throw new ValidupError([defineIssueItem({
            path,
            message: message(),
        })]);
    }
    return value;
};

// Inline validator — there's no `UserPasswordValidator` in core-kit;
// `UserValidator` covers `password` for the entity-edit path. This
// password-only form has its own length + match contract.
class UserPasswordValidator extends Container<{ password: string; passwordRepeat: string }> {
    constructor(sameAsPassword: Validator) {
        super();

        // Two mounts on `passwordRepeat` — length first (from
        // `initialize`), equality second. Container runs mounts in order;
        // a failure in the first short-circuits the key, so consumers
        // only see one issue at a time.
        this.mount('passwordRepeat', sameAsPassword);
    }

    protected override initialize() {
        super.initialize();

        const passwordValidator = createValidator(z.string().min(5).max(100));
        this.mount('password', passwordValidator);
        this.mount('passwordRepeat', passwordValidator);
    }
}

export default defineComponent({
    components: {
        VCFormGroup,
        VCFormInput,
        VCFormSwitch,
        AFormSubmit,

        IFieldValidation,
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
            passwordRepeat: '',
        });

        const passwordShow = ref(false);

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PASSWORD,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PASSWORD_REPEAT,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.PASSWORD_MUST_MATCH,
            },
        ]);

        const actionTranslations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.SHOW,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.HIDE,
            },
        ]);

        const v = useValidup(
            new UserPasswordValidator(createSameAsPassword(() => translations.passwordMustMatch)),
            form,
        );

        const submit = wrapFnWithBusyState(busy, async () => {
            // `v.$invalid` already covers length + password-repeat match
            // (the `sameAsPassword` validator above).
            if (v.$invalid.value) return;
            if (!props.id) return;

            try {
                const user = await apiClient.user.update(props.id, {
                    password: form.password,
                    passwordRepeat: form.passwordRepeat,
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
            translations,
            actionTranslations,
            v,
            submit,
        };
    },
});

</script>

<template>
    <form
        class="flex flex-col gap-3"
        @submit.prevent="submit"
    >
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.password"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.password }}
                </template>
                <VCFormInput
                    v-model="v.fields.password.$model.value"
                    :type="passwordShow ? 'text' : 'password'"
                    autocomplete="new-password"
                />
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.passwordRepeat"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.passwordRepeat }}
                </template>
                <VCFormInput
                    v-model="v.fields.passwordRepeat.$model.value"
                    :type="passwordShow ? 'text' : 'password'"
                    autocomplete="new-password"
                />
            </VCFormGroup>
        </IFieldValidation>

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
                        {{ translations.password }} {{ passwordShow ? actionTranslations.hide : actionTranslations.show }}
                    </label>
                </template>
            </VCFormSwitch>
        </div>

        <div>
            <AFormSubmit
                :is-busy="busy"
                :is-editing="true"
                :is-invalid="v.$invalid.value"
                @submit="submit"
            />
        </div>
    </form>
</template>
