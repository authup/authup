/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ValidationTranslator } from '@vue-layout/form-controls';
import { useTranslator } from './singleton';

export function buildValidationTranslator(locale?: string) : ValidationTranslator {
    return function translate(validator: string, parameters?: Record<string, any>) : string | undefined {
        return useTranslator().getSync(`validation.${validator}`, parameters, locale);
    };
}
