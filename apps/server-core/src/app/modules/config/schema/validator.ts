/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import type { Container } from 'validup';
import type { ConfigSchemaInput } from './types.ts';

/**
 * Mount one optional validator per schema key onto the container, so the
 * declared zod type is what a parsed configuration is checked against.
 */
export function mountSchema<T extends Record<string, any>>(
    container: Container<T>,
    schema: ConfigSchemaInput<T>,
) : void {
    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        container.mount(key as string, { optional: true }, createValidator(schema[key].type));
    }
}
