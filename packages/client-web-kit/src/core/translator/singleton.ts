/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Composable, FieldState } from '@validup/vue';
import {
    useTranslation as _useTranslation,
    injectLocale,
} from '@ilingo/vue';
import {
    useTranslationsForComposable as _useTranslationsForComposable,
    useTranslationsForField as _useTranslationsForField,
} from '@ilingo/validup-vue';
import type { FieldTranslations } from '@ilingo/validup-vue';
import type { GetContextReactive } from '@ilingo/vue';
import type { ObjectLiteral } from 'validup';
import type { Ref } from 'vue';

export function injectTranslatorLocale(): Ref<string> {
    return injectLocale();
}

export function useTranslation(input: GetContextReactive): Ref<string> {
    return _useTranslation(input);
}

/**
 * Translate the visible errors of a `@validup/vue` `FieldState` to
 * localized messages. Successor to the previous
 * `useTranslationsForBaseValidation` — reads `fieldState.$errors`
 * (already dirty-gated by `@validup/vue`), so the returned
 * `Ref<IssueTranslation[]>` only carries entries the user should see.
 */
export function useTranslationsForField<V = unknown>(
    fieldState: FieldState<V>,
): FieldTranslations {
    return _useTranslationsForField(fieldState);
}

/**
 * Translate the form-level `$errors` of a `@validup/vue` `Composable<T>`.
 * Successor to the previous `useTranslationsForNestedValidation` — sugar
 * for the common "render all dirty-gated field errors" pattern.
 */
export function useTranslationsForComposable<T extends ObjectLiteral = ObjectLiteral>(
    composable: Composable<T>,
): FieldTranslations {
    return _useTranslationsForComposable(composable);
}
