/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    BaseValidationTranslations,
    NestedValidationsTranslations,
} from '@ilingo/vuelidate';
import {
    useTranslationsForBaseValidation as _useTranslationsForBaseValidation,
    useTranslationsForNestedValidations as _useTranslationsForNestedValidations,
} from '@ilingo/vuelidate';
import { useTranslation as _useTranslation, injectLocale } from '@ilingo/vuelidate/vue';
import type {
    BaseValidation, Validation, ValidationArgs, ValidationRuleCollection,
} from '@vuelidate/core';
import type { GetContextReactive } from '@ilingo/vue';
import type { Ref } from 'vue';

export function injectTranslatorLocale() : Ref<string> {
    return injectLocale();
}

export function useTranslation(input: GetContextReactive) : Ref<string> {
    return _useTranslation(input);
}

export function useTranslationsForBaseValidation<
    T = unknown,
    V extends ValidationRuleCollection<T> = ValidationRuleCollection<T>,
>(
    result: BaseValidation<T, V>,
) : BaseValidationTranslations {
    return _useTranslationsForBaseValidation(result);
}

export function useTranslationsForNestedValidation<
    V extends ValidationArgs = ValidationArgs,
    T = unknown,
>(validation: Validation<V, T>) : NestedValidationsTranslations<T> {
    return _useTranslationsForNestedValidations(validation);
}
