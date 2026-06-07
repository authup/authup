/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Composable } from '@validup/vue';
import { getSeverity } from '@validup/vue';
import type { ObjectLiteral } from 'validup';

/**
 * Re-export of `@validup/vue`'s `getSeverity()`: `'error'` when the field is
 * `$invalid && $dirty`, `'warning'` for pending-but-dirty, `undefined` for
 * pristine.
 */
export { getSeverity };

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
