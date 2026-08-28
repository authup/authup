/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import type { ConfigSchemaInput } from './types.ts';
import { isConfigSchemaEntryInput, isConfigSchemaInput } from './check.ts';

/**
 * Mount one optional validator per schema key onto the container, so the
 * declared zod type is what a parsed configuration is checked against.
 */
export function mountSchema<T extends Record<string, any>>(
    container: Container<T>,
    schema: ConfigSchemaInput<T>,
) : void {
    const keys = Object.keys(schema) as (keyof ConfigSchemaInput<T>)[];
    for (const key of keys) {
        const entry = schema[key];
        if (isConfigSchemaEntryInput(entry)) {
            container.mount(key as string, { optional: true }, createValidator(entry.type));
            continue;
        }

        if (isConfigSchemaInput(entry)) {
            const child = new Container();
            mountSchema(child, entry);
        }
    }
}
