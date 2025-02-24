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
    buildFormGroup, buildFormInput, buildFormInputCheckbox,
} from '@vuecs/form-controls';
import {
    buildFormSubmitWithTranslations,
    createFormSubmitTranslations, getVuelidateSeverity,
    injectHTTPClient,
    useTranslationsForNestedValidation,
    wrapFnWithBusyState,
} from '../../../core';

export const AUserPasswordForm = defineComponent({
    props: {
        id: {
            type: String,
            required: true,
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

        const validationMessages = useTranslationsForNestedValidation($v.value);
        const submitTranslations = createFormSubmitTranslations();

        const render = () => {
            const password = buildFormGroup({
                validationMessages: validationMessages.password.value,
                validationSeverity: getVuelidateSeverity($v.value.password),
                label: true,
                labelContent: 'Password',
                content: buildFormInput({
                    value: $v.value.password.$model,
                    onChange(input) {
                        $v.value.password.$model = input;
                    },
                    props: {
                        type: passwordShow.value ? 'text' : 'password',
                        autocomplete: 'new-password',
                    },
                }),
            });

            const passwordRepeat = buildFormGroup({
                validationMessages: validationMessages.password_repeat.value,
                validationSeverity: getVuelidateSeverity($v.value.password_repeat),
                label: true,
                labelContent: 'Password repeat',
                content: buildFormInput({
                    value: $v.value.password_repeat.$model,
                    onChange(input) {
                        $v.value.password_repeat.$model = input;
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

            const submitButton = buildFormSubmitWithTranslations({
                submit,
                isEditing: true,
                invalid: $v.value.$invalid,
            }, submitTranslations);

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

export default AUserPasswordForm;
