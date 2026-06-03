/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Composable, FieldState } from '@validup/vue';
import { getSeverity } from '@validup/vue';
import { useFieldValidation as baseUseFieldValidation } from '@ilingo/validup-vue';
import type { ObjectLiteral } from 'validup';

/**
 * Re-export of `@validup/vue`'s `getSeverity()` — kept under the legacy
 * `getVuelidateSeverity` name for one migration cycle so consumer call
 * sites don't have to rename in lockstep. The behaviour is identical:
 * `'error'` when the field is `$invalid && $dirty`, `'warning'` for
 * pending-but-dirty, `undefined` for pristine.
 */
export { getSeverity };

/**
 * Memoized wrapper around `@ilingo/validup-vue`'s `useFieldValidation()`.
 *
 * The upstream implementation calls VueUse's `computedAsync()` internally,
 * which registers a `watchEffect()` in the current component's effect
 * scope. The upstream docstring recommends calling it **inline in
 * templates** (`<VCFormGroup :validation="useFieldValidation(v.fields.X)">`)
 * — but every template render then re-registers a fresh watcher, which
 * accumulates over the component's lifetime. On every keystroke the
 * mounting form-control triggers all accumulated watchers, each schedules
 * an async translate, each commits a reactive write, each re-renders →
 * appends another watcher. The cascade saturates the scheduler and the
 * page hangs.
 *
 * Each `useValidup()` composable maintains its own per-path `FieldState`
 * cache, so same-key field accesses across renders return the **same**
 * `FieldState` object identity. We use that identity as a `WeakMap` key
 * and memoize the validation bundle per field. First render registers
 * the watcher (lives for the component's lifetime); subsequent renders
 * return the cached bundle without re-registering.
 *
 * Tracked upstream at tada5hi/ilingo#…  — drop this wrapper once
 * `@ilingo/validup-vue` memoizes internally (or moves the watchEffect
 * registration onto first-access only).
 */
const fieldValidationCache = new WeakMap<
    FieldState<any>,
    ReturnType<typeof baseUseFieldValidation>
>();

export function useFieldValidation<V>(field: FieldState<V>): ReturnType<typeof baseUseFieldValidation> {
    let bundle = fieldValidationCache.get(field);
    if (!bundle) {
        bundle = baseUseFieldValidation(field);
        fieldValidationCache.set(field, bundle);
    }
    return bundle;
}

/**
 * Snapshot the `$model` values of every top-level field in a registered
 * child composable. Successor to the legacy
 * `extractVuelidateResultsFromChild` — replaces vuelidate's
 * `$getResultsForChild` walk with `@validup/vue`'s typed equivalent.
 *
 * Returns a plain `Record<string, any>` for ergonomic spreading into a
 * parent submit body (`{ ...extract(v, 'basic'), ...extract(v, 'type') }`).
 * Returns an empty object when the named child is not registered (mirrors
 * the legacy permissive contract — composing forms that conditionally
 * mount sub-composables should stay graceful).
 */
export function extractValidupResultsFromChild<C extends ObjectLiteral = ObjectLiteral>(
    composable: Composable<any>,
    name: string,
    keys?: string[],
): Record<string, any> {
    const child = composable.$getResultsForChild<C>(name);
    if (!child) {
        return {};
    }

    const fieldKeys = keys ?? (Object.keys(child.fields) as string[]);

    const output: Record<string, any> = {};
    for (const key of fieldKeys) {
        const field = (child.fields as Record<string, { $model: { value: unknown } } | undefined>)[key];
        if (field) {
            output[key] = field.$model.value;
        }
    }
    return output;
}
