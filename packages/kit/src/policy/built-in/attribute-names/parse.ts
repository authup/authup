/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import type { AttributeNamesPolicyOptions } from './types';

const schema = zod.object({
    invert: zod.boolean().optional(),
    names: zod.array(zod.string()),
});

export function parseAttributeNamesPolicyOptions(input: unknown) : AttributeNamesPolicyOptions {
    return schema.parse(input);
}
