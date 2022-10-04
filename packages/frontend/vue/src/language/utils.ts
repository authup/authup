/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidationTranslator } from '@vue-layout/hyperscript';
import { useAuthIlingo } from './singleton';

export function buildVuelidateTranslator(locale?: string) : ValidationTranslator {
    return function translate(validator: string, parameters?: Record<string, any>) : string | undefined {
        return useAuthIlingo().getSync(`validation.${validator}`, parameters, locale);
    };
}
