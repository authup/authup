/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LOCALES } from '@authup/i18n';
import { injectLocale } from '@ilingo/vue';
import {
    computed,
    defineComponent,
    h,
    ref,
} from 'vue';

const ALanguageSwitcherDropdown = defineComponent({
    props: {
        linkClassExtra: {
            type: String,
            default: undefined,
        },
    },
    // Deliberately NOT `async`: an async setup() turns the component into
    // a Suspense-dependent subtree. Nuxt (client-web) provides a root
    // Suspense, but the embedded server-core SSR app does not — there the
    // component would server-render yet never hydrate (dropdown dead).
    setup(props) {
        const opened = ref(false);

        const locale = injectLocale();

        const elements = computed(() => LOCALES.map((descriptor) => ({
            value: descriptor.code,
            label: descriptor.nativeName,
            active: locale.value === descriptor.code,
        })));

        const activeCode = computed(() => {
            const match = LOCALES.find(
                (descriptor) => descriptor.code === locale.value,
            );
            return match ? match.code : locale.value;
        });

        const setLocale = (input: string) => {
            locale.value = input;
            opened.value = false;
        };

        return () => h('div', { class: 'dropdown' }, [
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
                activeCode.value,
            ]),
            h('div', {
                class: [
                    'dropdown-menu',
                    'dropdown-menu-end',
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
            }, [element.label]))),
        ]);
    },
});

export { ALanguageSwitcherDropdown };

/**
 * @deprecated Import `ALanguageSwitcherDropdown` instead.
 */
export const LanguageSwitcherDropdown = ALanguageSwitcherDropdown;
