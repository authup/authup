/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ValidationTranslator } from '@vue-layout/form-controls';
import type { Ref } from 'vue';
import {
    inject, isRef, provide, ref,
} from 'vue';
import { useTranslator } from './singleton';

const translatorLocaleSymbol = Symbol.for('TranslatorLocale');

export function setTranslatorLocale(locale: string | Ref<string>) {
    provide(translatorLocaleSymbol, isRef(locale) ? locale : ref(locale));
}

export function useTranslatorLocale() : Ref<string> {
    const locale = inject<string | Ref<string>>(translatorLocaleSymbol);
    if (!locale) {
        return ref('en');
    }

    return isRef(locale) ? locale : ref(locale);
}

export function useValidationTranslator(locale?: string) : ValidationTranslator {
    if (!locale) {
        const refLocale = useTranslatorLocale();

        locale = refLocale.value;
    }

    return function translate(validator: string, parameters?: Record<string, any>) : string | undefined {
        return useTranslator().getSync(`validation.${validator}`, parameters, locale);
    };
}
