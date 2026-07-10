/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isEqual } from 'smob';
import type { AssignFormPropertiesOptions, PartialRecordWithNull } from './types';

/**
 * Hydrate form state from a data source (e.g. a loaded entity):
 * assign `data`'s values onto `form`. 'null' values are transformed to an
 * empty string so they bind cleanly to form inputs.
 *
 * Only keys already declared in `form` are assigned — the form state owns
 * its shape. Copying every data key would leak unrelated entity properties
 * (id, timestamps, sibling sub-form fields, ...) into the form state and
 * from there into submit payloads, where a stale copy from one sub-form
 * can clobber an edited value from another.
 *
 * When `options.fields` is provided (the validup `fields` accessor bound
 * to `form`), hydration preserves unsaved user edits — see
 * {@link AssignFormPropertiesOptions}.
 *
 * @param form the form state to hydrate (mutated in place)
 * @param data the data source to read values from
 * @param options optional edit-preserving behavior
 */
export function assignFormProperties<T extends Record<string, any>>(
    form: T,
    data: PartialRecordWithNull<T> = {},
    options: AssignFormPropertiesOptions = {},
) : T {
    const keys : (keyof T)[] = Object.keys(form);
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
            continue;
        }

        const value = data[key];
        const next = (value === null ? '' : value) as T[keyof T];

        if (options.fields) {
            const field = options.fields.at(key as string);
            if (field.$dirty.value) {
                if (!isEqual(form[key], next)) {
                    continue;
                }

                field.$reset();
            }
        }

        form[key] = next;
    }

    return form;
}
