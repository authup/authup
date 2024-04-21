/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectLocale } from '@ilingo/vuelidate/vue';
import {
    computed, defineComponent, h, ref,
} from 'vue';

const LanguageSwitcherDropdown = defineComponent({
    props: {
        linkClassExtra: {
            type: String,
            default: undefined,
        },
    },
    async setup(props) {
        const opened = ref(false);

        const locale = injectLocale();
        const locales = ['de', 'en'];

        const elements = computed(() => {
            const output = [];
            for (let i = 0; i < locales.length; i++) {
                output.push({
                    value: locales[i],
                    active: locale.value === locales[i],
                });
            }

            return output;
        });

        const setLocale = (input: string) => {
            locale.value = input;
            opened.value = false;
        };

        return () => [
            h('button', {
                class: [
                    'dropdown-toggle',
                    props.linkClassExtra,
                ],
                onClick(event: any) {
                    event.preventDefault();

                    opened.value = !opened.value;
                },
            }, [
                locale.value,
            ]),
            h('div', {
                class: [
                    'dropdown-menu',
                    opened.value ? 'show' : '',
                ],
            }, elements.value.map((element) => h('button', {
                onClick(event) {
                    event.preventDefault();

                    setLocale(element.value);
                },
                class: [
                    'dropdown-item',
                    element.active ? 'active' : '',
                ],
            }, [element.value]))),
        ];
    },
});

export {
    LanguageSwitcherDropdown,
};
