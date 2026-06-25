/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LOCALES } from '@authup/i18n';
import {
    computed,
    defineComponent,
    h,
} from 'vue';
import {
    VCDropdownMenu,
    VCDropdownMenuContent,
    VCDropdownMenuItem,
    VCDropdownMenuTrigger,
} from '@vuecs/overlays';
import { useLocaleControl } from '../../core';

// Active locale keeps the primary fill while keyboard/pointer focus moves
// over it — the `data-[highlighted]` pair overrides the theme item's neutral
// hover background so the selected row stays visibly selected.
const ACTIVE_ITEM_CLASS = 'bg-primary-600 text-on-primary data-[highlighted]:bg-primary-700 data-[highlighted]:text-on-primary';

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
        // vuecs owns the locale (cookie-backed) when installed; the control
        // falls back to ilingo otherwise. Writing here persists via vuecs.
        const { code, set } = useLocaleControl();

        const elements = computed(() => LOCALES.map((descriptor) => ({
            value: descriptor.code,
            label: descriptor.nativeName,
            active: code.value === descriptor.code,
        })));

        const activeCode = computed(() => code.value);

        return () => h(VCDropdownMenu, null, {
            default: () => [
                h(VCDropdownMenuTrigger, { class: ['cursor-pointer', props.linkClassExtra] }, () => activeCode.value),
                h(VCDropdownMenuContent, { align: 'end' }, () => elements.value.map((element) => h(
                    VCDropdownMenuItem,
                    {
                        key: element.value,
                        class: element.active ? ACTIVE_ITEM_CLASS : undefined,
                        onSelect: () => set(element.value),
                    },
                    () => element.label,
                ))),
            ],
        });
    },
});

export { ALanguageSwitcherDropdown };

/**
 * @deprecated Import `ALanguageSwitcherDropdown` instead.
 */
export const LanguageSwitcherDropdown = ALanguageSwitcherDropdown;
