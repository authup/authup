/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildFormInput, buildFormSubmit } from '@vue-layout/hyperscript';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import { useToast } from 'vue-toastification';
import { defineNuxtComponent, navigateTo, useRoute } from '#app';
import { reactive, ref } from '#imports';
import { translateValidationMessage } from '../composables/ilingo';
import { LayoutKey, LayoutNavigationID } from '../config/layout';
import { useAuthStore } from '../store/auth';

export default defineNuxtComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_OUT]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.DEFAULT,
        });

        const form = reactive({
            name: '',
            password: '',
        });

        const vuelidate = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(255),
            },
            password: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(255),
            },
        }, form);

        const store = useAuthStore();

        const busy = ref(false);

        const submit = async () => {
            try {
                await store.login(form.name, form.password);

                const route = useRoute();
                navigateTo({ path: (route.query.redirect || '/') as string });
            } catch (e) {
                const toast = useToast();
                toast.warning(e.message);
            }
        };

        const render = () => {
            const name = buildFormInput({
                validationResult: vuelidate.value.name,
                validationTranslator: translateValidationMessage,
                labelContent: 'Name',
                value: form.name,
                onChange(value) {
                    form.name = value;
                },
            });

            const password = buildFormInput({
                validationResult: vuelidate.value.password,
                validationTranslator: translateValidationMessage,
                labelContent: 'Password',
                value: form.password,
                onChange(value) {
                    form.password = value;
                },
                props: {
                    type: 'password',
                },
            });

            const submitButton = buildFormSubmit({
                validationResult: vuelidate.value,
                createText: 'Login',
                createButtonClass: 'btn btn-sm btn-dark btn-block',
                createIconClass: 'fa-solid fa-right-to-bracket',
                submit,
                busy,
            });

            return h('div', { staticClass: 'container' }, [
                h('h4', 'Login'),
                h('form', {
                    onSubmit($event) {
                        $event.preventDefault();

                        return submit.call(null);
                    },
                }, [
                    name,
                    password,
                    submitButton,
                ]),
            ]);
        };

        return () => render();
    },
});
