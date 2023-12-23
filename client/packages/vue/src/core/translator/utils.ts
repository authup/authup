/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ValidationTranslator } from '@vuecs/form-controls';
import type { App, Ref } from 'vue';
import {
    inject, isRef, provide, ref,
} from 'vue';
import { useTranslator } from './singleton';

const TranslatorLocaleSymbol = Symbol.for('TranslatorLocale');

export function provideTranslatorLocale(locale: string | Ref<string>, app: App) {
    const value = isRef(locale) ? locale : ref(locale);

    if (typeof app === 'undefined') {
        provide(TranslatorLocaleSymbol, value);
        return;
    }

    app.provide(TranslatorLocaleSymbol, value);
}

export function injectTranslatorLocale() : Ref<string> {
    const locale = inject<string | Ref<string>>(TranslatorLocaleSymbol);
    if (!locale) {
        return ref('en');
    }

    return isRef(locale) ? locale : ref(locale);
}

export function useValidationTranslator(locale?: string) : ValidationTranslator {
    if (!locale) {
        const refLocale = injectTranslatorLocale();

        locale = refLocale.value;
    }

    return function translate(validator: string, parameters?: Record<string, any>) : string | undefined {
        return useTranslator().getSync(`validation.${validator}`, parameters, locale);
    };
}
