/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

type PartialRecordWithNull<T extends Record<string, any>> = {
    [K in keyof T]?: T[K] | null
};

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
 * @param form the form state to hydrate (mutated in place)
 * @param data the data source to read values from
 */
export function assignFormProperties<T extends Record<string, any>>(
    form: T,
    data: PartialRecordWithNull<T> = {},
) : T {
    const keys : (keyof T)[] = Object.keys(form);
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
            continue;
        }

        const value = data[key];
        if (value === null) {
            form[key] = '' as T[keyof T];
        } else {
            form[key] = value as T[keyof T];
        }
    }

    return form;
}
