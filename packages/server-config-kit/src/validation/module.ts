/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import type { SchemaInput } from '../types.ts';
import { isSchemaEntryInput } from '../entry/check.ts';
import { assertSchemaValue, isSchemaInput } from '../schema/check.ts';

/**
 * Mount one optional validator per schema key onto the container, so the
 * declared zod type is what a parsed configuration is checked against.
 *
 * A nested section is mounted as a child container under its own key. It has
 * to be ATTACHED, not merely built: validup strips what nothing claims, so an
 * unmounted section is neither validated nor carried over into the result.
 */
export function mountSchema<T extends Record<string, any>>(
    container: Container<T>,
    schema: SchemaInput<T>,
) : void {
    const keys = Object.keys(schema) as (keyof SchemaInput<T>)[];
    for (const key of keys) {
        const entry = schema[key];
        if (isSchemaEntryInput(entry)) {
            container.mount(key as string, { optional: true }, createValidator(entry.type));
            continue;
        }

        if (isSchemaInput(entry)) {
            const child = new Container();
            mountSchema<any>(child, entry);

            container.mount(key as string, { optional: true }, child);
            continue;
        }

        assertSchemaValue(key as string);
    }
}
