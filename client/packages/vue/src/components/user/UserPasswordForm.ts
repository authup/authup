/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required, sameAs,
} from '@vuelidate/validators';
import {
    defineComponent, h, reactive, ref, toRef,
} from 'vue';
import {
    buildFormGroup, buildFormInput, buildFormInputCheckbox, buildFormSubmit,
} from '@vuecs/form-controls';
import { injectAPIClient } from '../../core';
import { useTranslator, useValidationTranslator } from '../../core/translator';

export const UserPasswordForm = defineComponent({
    props: {
        id: {
            type: String,
            required: true,
        },
        translatorLocale: {
            type: String,
            default: undefined,
        },
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const apiClient = injectAPIClient();
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

        const submit = async () => {
            if (busy.value) return;

            busy.value = true;

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

            busy.value = false;
        };

        const render = () => {
            const password = buildFormGroup({
                validationResult: $v.value.password,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Password',
                content: buildFormInput({
                    value: form.password,
                    onChange(input) {
                        form.password = input;
                    },
                    props: {
                        type: passwordShow.value ? 'text' : 'password',
                        autocomplete: 'new-password',
                    },
                }),
            });

            const passwordRepeat = buildFormGroup({
                validationResult: $v.value.password_repeat,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Password repeat',
                content: buildFormInput({
                    value: form.password_repeat,
                    onChange(input) {
                        form.password_repeat = input;
                    },
                    props: {
                        type: passwordShow.value ? 'text' : 'password',
                        autocomplete: 'new-password',
                    },
                }),
            });

            const showPassword = buildFormInputCheckbox({
                groupClass: 'mt-3',
                labelContent: [
                    'Password ',
                    (passwordShow.value ? 'hide' : 'show'),
                ],
                value: passwordShow.value,
                onChange(input) {
                    passwordShow.value = input;
                },
            });

            const submitButton = buildFormSubmit({
                updateText: useTranslator().getSync('form.update.button'),
                createText: useTranslator().getSync('form.create.button'),
                submit,
                isEditing: true,
            });

            return h('form', {
                onSubmit($event: any) {
                    $event.preventDefault();

                    return submit.apply(null);
                },
            }, [
                password,
                passwordRepeat,
                showPassword,
                submitButton,
            ]);
        };

        return () => render();
    },
});

export default UserPasswordForm;
