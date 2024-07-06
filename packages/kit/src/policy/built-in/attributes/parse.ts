/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import type { AttributesPolicyOptions } from './types';

const schema = zod.object({
    invert: zod.boolean().optional(),
    query: zod.object({}).passthrough(),
});

export function parseAttributesOptions(input: unknown) : AttributesPolicyOptions {
    return schema.parse(input);
}
